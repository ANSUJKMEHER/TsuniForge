#!/bin/bash
# ============================================
# TsuniForge — Oracle Cloud VM Setup Script
# ============================================
# Run this on a fresh Ubuntu 22.04+ ARM instance
# Usage: chmod +x setup-server.sh && sudo ./setup-server.sh
# ============================================

set -e

echo "═══════════════════════════════════════"
echo "  TsuniForge — Server Setup"
echo "═══════════════════════════════════════"

# ─── 1. System Updates ──────────────────────
echo ""
echo "▸ Updating system packages..."
apt-get update && apt-get upgrade -y

# ─── 2. Install Docker ──────────────────────
echo ""
echo "▸ Installing Docker..."
apt-get install -y ca-certificates curl gnupg lsb-release

# Add Docker GPG key
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repo
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add current user to docker group
usermod -aG docker $SUDO_USER || usermod -aG docker ubuntu

echo "  ✓ Docker installed: $(docker --version)"

# ─── 3. Install Git ─────────────────────────
echo ""
echo "▸ Installing Git..."
apt-get install -y git

# ─── 4. Configure Firewall ──────────────────
echo ""
echo "▸ Configuring firewall..."
apt-get install -y ufw

ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
echo "y" | ufw enable

echo "  ✓ Firewall configured (SSH, HTTP, HTTPS open)"

# ─── 5. Create Swap (if not present) ────────
echo ""
echo "▸ Setting up swap space..."
if [ ! -f /swapfile ]; then
    fallocate -l 4G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
    echo "  ✓ 4GB swap created"
else
    echo "  ✓ Swap already exists"
fi

# ─── 6. Clone Repository ────────────────────
echo ""
echo "▸ Ready to clone your repository!"
echo ""
echo "═══════════════════════════════════════"
echo "  ✅ Server setup complete!"
echo "═══════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Clone your repo:"
echo "     git clone https://github.com/YOUR_USERNAME/TsuniForge.git"
echo "     cd TsuniForge/deploy"
echo ""
echo "  2. Create your .env file:"
echo "     cp .env.production.example .env"
echo "     nano .env  (fill in your secrets)"
echo ""
echo "  3. Generate JWT secrets:"
echo "     openssl rand -hex 32   (run twice, one for each secret)"
echo ""
echo "  4. Build and start everything:"
echo "     docker compose -f docker-compose.prod.yml up -d --build"
echo ""
echo "  5. Seed the database:"
echo "     docker exec -it tf-api node dist/database/seed.js"
echo ""
echo "  6. (Optional) Set up SSL with a domain:"
echo "     docker exec tf-certbot certbot certonly --webroot \\"
echo "       -w /var/www/certbot -d YOUR_DOMAIN --non-interactive --agree-tos -m YOUR_EMAIL"
echo "     Then uncomment the HTTPS block in nginx/default.conf"
echo "     docker compose -f docker-compose.prod.yml restart nginx"
echo ""
echo "═══════════════════════════════════════"
