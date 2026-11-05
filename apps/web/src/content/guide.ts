export const guideTitle = "codaryn workspace guide";
export const guideSections = [
  {
    title: "Connect and analyze",
    text: "Sign in with GitHub, select a workspace, and install the GitHub App for the repositories you choose. Signing in and installing repository access are separate operations. In Studio, pin a commit and select analysis stages. Ordinary analysis parses source without running repository scripts.",
  },
  {
    title: "Navigate evidence",
    text: "Open Dependency Graph and choose a completed analysis. Search covers stored nodes; pages contain at most 200 nodes and 400 connecting relationships. Some cross-page relationships are omitted. Select a node with Enter or Space to inspect its bounded neighborhood. Static relationships describe potential structure, not confirmed runtime execution.",
  },
  {
    title: "Private sharing and exports",
    text: "Architecture links require the named recipient's current workspace access. Export downloads expire, are personal and can be consumed only once. If an export is queued, it needs an authorized worker; refresh to observe completion. Never paste private link fragments or credentials into support requests.",
  },
  {
    title: "Recover safely",
    text: "If a view fails, use its retry control. During a network outage only this downloaded public guide is available; private workspace data is never cached for offline use. Reauthenticate after permission changes. Ask your operator to investigate stalled jobs or restore backups using the documented recovery drill.",
  },
  {
    title: "Administration",
    text: "Owners and administrators manage workspace controls and presets. Retention is disabled by default. Review the exact deletion preview before applying it; retention changes require recent sign-in and do not erase source archives. Keep independent backups and protect preserved baselines.",
  },
] as const;
export const offlineGuide = [
  guideTitle,
  ...guideSections.map((section) => `${section.title}\n${section.text}`),
].join("\n\n");
