import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRoleEnum } from '../../../database/entities/user.entity';

describe('RolesGuard (SEC-AUTH-05 RBAC Enforcement)', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const createMockExecutionContext = (user?: any): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
        getResponse: jest.fn(),
        getNext: jest.fn(),
      }),
      getType: jest.fn().mockReturnValue('http'),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should permit access if route is not annotated with @Roles', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);
    const context = createMockExecutionContext({ role: UserRoleEnum.USER });

    const result = guard.canActivate(context);
    expect(result).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  });

  it('should permit access if user has one of the required roles', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
      UserRoleEnum.ADMIN,
      UserRoleEnum.COMPANY,
    ]);
    const context = createMockExecutionContext({
      id: 'company-user-1',
      role: UserRoleEnum.COMPANY,
    });

    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should throw ForbiddenException if user is not present in request', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([UserRoleEnum.ADMIN]);
    const context = createMockExecutionContext(undefined); // unauthenticated

    expect(() => guard.canActivate(context)).toThrow(
      new ForbiddenException('No user found in request'),
    );
  });

  it('should throw ForbiddenException if user role does not match required roles', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([UserRoleEnum.ADMIN]);
    const context = createMockExecutionContext({
      id: 'regular-user-1',
      role: UserRoleEnum.USER,
    });

    expect(() => guard.canActivate(context)).toThrow(
      new ForbiddenException("User role 'user' is not authorized. Required: admin"),
    );
  });

  it('should format multiple required roles in ForbiddenException message', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
      UserRoleEnum.ADMIN,
      UserRoleEnum.COMPANY,
    ]);
    const context = createMockExecutionContext({
      id: 'regular-user-1',
      role: UserRoleEnum.USER,
    });

    expect(() => guard.canActivate(context)).toThrow(
      new ForbiddenException(
        "User role 'user' is not authorized. Required: admin, company",
      ),
    );
  });
});
