import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Submission, VerdictEnum } from '../../database/entities/submission.entity';
import { Contest } from '../../database/entities/contest.entity';
import { MinioService } from '../../common/services/minio.service';

export interface PlagiarismResult {
  problemId: string;
  problemTitle: string;
  submissionAId: string;
  submissionBId: string;
  usernameA: string;
  usernameB: string;
  similarity: number; // Percentage
  overlappingHashesCount: number;
}

@Injectable()
export class PlagiarismService {
  private readonly logger = new Logger(PlagiarismService.name);

  constructor(
    @InjectRepository(Submission)
    private readonly submissionRepo: Repository<Submission>,
    @InjectRepository(Contest)
    private readonly contestRepo: Repository<Contest>,
    private readonly minioService: MinioService,
  ) {}

  /**
   * Run plagiarism scan on all AC submissions in a contest
   */
  async runContestScan(contestId: string): Promise<PlagiarismResult[]> {
    const contest = await this.contestRepo.findOne({
      where: { id: contestId },
    });

    if (!contest) {
      throw new NotFoundException('Contest not found');
    }

    this.logger.log(`Running plagiarism scan for contest '${contest.title}' (${contestId})...`);

    // Fetch all AC submissions in this contest
    const submissions = await this.submissionRepo.find({
      where: { contestId, verdict: VerdictEnum.AC },
      relations: ['user', 'problem'],
    });

    if (submissions.length < 2) {
      this.logger.log('Not enough submissions to run plagiarism scan');
      return [];
    }

    // Group submissions by problem
    const problemGroups = new Map<string, Submission[]>();
    for (const sub of submissions) {
      if (!problemGroups.has(sub.problemId)) {
        problemGroups.set(sub.problemId, []);
      }
      problemGroups.get(sub.problemId)!.push(sub);
    }

    const results: PlagiarismResult[] = [];

    // Analyze each problem group
    for (const [problemId, subs] of problemGroups.entries()) {
      if (subs.length < 2) continue;

      const problemTitle = subs[0].problem?.title || 'Unknown Problem';
      this.logger.log(`Scanning ${subs.length} submissions for problem: ${problemTitle}`);

      // Fetch code for all submissions in this problem group
      const codeCache = new Map<string, string>();
      for (const sub of subs) {
        if (sub.codeKey) {
          try {
            const code = await this.minioService.getCode(sub.codeKey);
            codeCache.set(sub.id, code);
          } catch (err) {
            this.logger.error(`Failed to load code for submission ${sub.id} during plagiarism check`, err);
          }
        }
      }

      // Generate fingerprints for all fetched submissions
      const fingerprints = new Map<string, number[]>();
      for (const sub of subs) {
        const code = codeCache.get(sub.id);
        if (code) {
          const fp = this.generateFingerprint(code);
          fingerprints.set(sub.id, fp);
        }
      }

      // Compare pairs (all combinations)
      for (let i = 0; i < subs.length; i++) {
        for (let j = i + 1; j < subs.length; j++) {
          const subA = subs[i];
          const subB = subs[j];

          // Skip if they are by the same user
          if (subA.userId === subB.userId) continue;

          const fpA = fingerprints.get(subA.id);
          const fpB = fingerprints.get(subB.id);

          if (!fpA || !fpB || fpA.length === 0 || fpB.length === 0) continue;

          const match = this.compareFingerprints(fpA, fpB);
          
          // Flag if similarity exceeds 50%
          if (match.similarity >= 50) {
            results.push({
              problemId,
              problemTitle,
              submissionAId: subA.id,
              submissionBId: subB.id,
              usernameA: subA.user?.username || 'Unknown',
              usernameB: subB.user?.username || 'Unknown',
              similarity: parseFloat(match.similarity.toFixed(1)),
              overlappingHashesCount: match.overlapCount,
            });
          }
        }
      }
    }

    this.logger.log(`Plagiarism scan completed. Found ${results.length} flags.`);
    return results;
  }

  /**
   * Winnowing Algorithm Implementation
   */
  private generateFingerprint(code: string, k = 30, w = 8): number[] {
    // 1. Normalize code (remove whitespace, comments, convert to lowercase)
    const normalized = this.normalizeCode(code);

    if (normalized.length < k) {
      return [];
    }

    // 2. Generate k-grams
    const kGrams: string[] = [];
    for (let i = 0; i <= normalized.length - k; i++) {
      kGrams.push(normalized.substring(i, i + k));
    }

    // 3. Hash k-grams
    const hashes = kGrams.map((kg) => this.hashString(kg));

    // 4. Winnowing (sliding window of size w)
    const fingerprint: number[] = [];
    let minIndex = -1;

    for (let i = 0; i <= hashes.length - w; i++) {
      let currentMin = Infinity;
      let currentMinIndex = -1;

      // Scan current window
      for (let j = 0; j < w; j++) {
        const hash = hashes[i + j];
        // Select rightmost minimum to break ties correctly
        if (hash <= currentMin) {
          currentMin = hash;
          currentMinIndex = i + j;
        }
      }

      // Add to fingerprint only if it is a new hash selection
      if (currentMinIndex !== minIndex) {
        fingerprint.push(currentMin);
        minIndex = currentMinIndex;
      }
    }

    return fingerprint;
  }

  /**
   * Compare two fingerprints and return similarity stats
   */
  private compareFingerprints(fpA: number[], fpB: number[]) {
    const setA = new Set(fpA);
    const setB = new Set(fpB);

    let overlapCount = 0;
    for (const hash of setA) {
      if (setB.has(hash)) {
        overlapCount++;
      }
    }

    // Similarity ratio = size of intersection / size of the smaller set
    const smallerSize = Math.min(setA.size, setB.size);
    const similarity = smallerSize > 0 ? (overlapCount / smallerSize) * 100 : 0;

    return {
      similarity,
      overlapCount,
    };
  }

  /**
   * Clean and normalize code to compare structural token patterns rather than variables or styling.
   */
  private normalizeCode(code: string): string {
    // Remove comments
    let clean = code
      .replace(/\/\/.*$/gm, '') // Single line comments
      .replace(/\/\*[\s\S]*?\*\//g, ''); // Block comments

    // Remove all whitespace, newlines, and convert to lowercase
    clean = clean.replace(/\s+/g, '').toLowerCase();

    return clean;
  }

  /**
   * Simple hash function (polynomial rolling hash style)
   */
  private hashString(str: string): number {
    let hash = 0;
    const prime = 31;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * prime + str.charCodeAt(i)) | 0;
    }
    return hash;
  }
}
