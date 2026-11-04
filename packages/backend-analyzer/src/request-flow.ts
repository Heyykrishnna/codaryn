import ts from "typescript";
import type {
  BackendRoute,
  BackendController,
  BackendService,
  BackendRepository,
  RequestFlow,
} from "@codaryn/contracts";

export function extractValidationPatterns(sourceFile: ts.SourceFile): string[] {
  const patterns = new Set<string>();
  const text = sourceFile.getFullText();

  if (text.includes("z.object(") || text.includes("z.string(")) {
    patterns.add("zod");
  }
  if (text.includes("Joi.object(") || text.includes("Joi.string(")) {
    patterns.add("joi");
  }
  if (
    text.includes("@IsString()") ||
    text.includes("@IsNotEmpty()") ||
    text.includes("@IsEmail()") ||
    text.includes("@IsNumber()")
  ) {
    patterns.add("class-validator");
  }
  if (text.includes("schema: {") || text.includes("preValidation")) {
    patterns.add("fastify-schema");
  }

  return Array.from(patterns).sort((a, b) => a.localeCompare(b));
}

export function extractAuthenticationPatterns(
  sourceFile: ts.SourceFile,
): string[] {
  const patterns = new Set<string>();
  const text = sourceFile.getFullText();

  if (
    text.includes("passport.authenticate(") ||
    text.includes("@nestjs/passport")
  ) {
    patterns.add("passport");
  }
  if (text.includes("jwt.verify(") || text.includes("jsonwebtoken")) {
    patterns.add("jwt");
  }
  if (text.includes("AuthGuard") || text.includes("canActivate")) {
    patterns.add("guards");
  }
  if (text.includes("better-auth") || text.includes("createAuth(")) {
    patterns.add("better-auth");
  }
  if (
    text.includes("session") &&
    (text.includes("req.session") || text.includes("express-session"))
  ) {
    patterns.add("session");
  }

  return Array.from(patterns).sort((a, b) => a.localeCompare(b));
}

export function linkRequestFlows(
  routes: BackendRoute[],
  controllers: BackendController[],
  services: BackendService[],
  repositories: BackendRepository[],
): RequestFlow[] {
  const controllerMap = new Map<string, BackendController>();
  for (const c of controllers) {
    controllerMap.set(c.name.toLowerCase(), c);
  }

  const serviceMap = new Map<string, BackendService>();
  for (const s of services) {
    serviceMap.set(s.name.toLowerCase(), s);
  }

  const repoMap = new Map<string, BackendRepository>();
  for (const r of repositories) {
    repoMap.set(r.name.toLowerCase(), r);
  }

  const flows: RequestFlow[] = [];

  for (const route of routes) {
    const matchedServiceNames = new Set<string>();
    const matchedRepoNames = new Set<string>();

    let matchedController: BackendController | null = null;
    if (route.controllerName) {
      matchedController =
        controllerMap.get(route.controllerName.toLowerCase()) ?? null;
    }

    if (matchedController) {
      for (const svc of services) {
        const rootName = matchedController.name.replace(/controller$/i, "");
        if (svc.name.toLowerCase().startsWith(rootName.toLowerCase())) {
          matchedServiceNames.add(svc.name);
          for (const dep of svc.injectedDependencies) {
            const repo = repoMap.get(dep.toLowerCase());
            if (repo) {
              matchedRepoNames.add(repo.name);
            }
          }
        }
      }
    } else {
      const routeRoot = route.path.split("/").filter(Boolean)[0] ?? "";
      for (const svc of services) {
        if (
          routeRoot &&
          svc.name.toLowerCase().includes(routeRoot.toLowerCase())
        ) {
          matchedServiceNames.add(svc.name);
          for (const dep of svc.injectedDependencies) {
            const repo = repoMap.get(dep.toLowerCase());
            if (repo) {
              matchedRepoNames.add(repo.name);
            }
          }
        }
      }
    }

    const flowId = `flow:${route.id}`;
    flows.push({
      id: flowId,
      routeId: route.id,
      routePath: route.path,
      httpMethod: route.method,
      controllerName: matchedController ? matchedController.name : null,
      serviceNames: Array.from(matchedServiceNames).sort((a, b) =>
        a.localeCompare(b),
      ),
      repositoryNames: Array.from(matchedRepoNames).sort((a, b) =>
        a.localeCompare(b),
      ),
      middlewareChain: route.middleware,
      sourceEvidence: route.sourceEvidence,
    });
  }

  return flows;
}
