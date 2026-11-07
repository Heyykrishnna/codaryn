export const dashboardSections = [
  {
    href: "/",
    label: "Overview",
    description: "Workspace totals and next steps.",
    icon: "M3 10 12 3l9 7v10H3z M9 20v-7h6v7",
  },
  {
    href: "/studio",
    label: "Studio",
    description: "Configure and start repository analysis.",
    icon: "M4 4h16v16H4z M4 9h16 M9 13l-2 2 2 2 M15 13l2 2-2 2",
  },
  {
    href: "/quality",
    label: "Quality",
    description: "Review coverage, inventory, and security findings.",
    icon: "M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6z M8 12l3 3 5-6",
  },
  {
    href: "/execution",
    label: "Execution",
    description: "Follow calls and inspect execution paths.",
    icon: "M3 12h4l3-7 4 14 3-7h4",
  },
  {
    href: "/schema",
    label: "Schema",
    description: "Explore tables, relationships, and migrations.",
    icon: "M20 6c0 2-4 3-8 3S4 8 4 6s4-3 8-3 8 1 8 3z M4 6v12c0 2 4 3 8 3s8-1 8-3V6 M4 12c0 2 4 3 8 3s8-1 8-3",
  },
  {
    href: "/graph",
    label: "Graph",
    description: "Map dependencies and investigate cycles.",
    icon: "M6 5h4v4H6z M14 15h4v4h-4z M3 16h4v4H3z M8 9v3h8v3 M8 12H5v4",
  },
  {
    href: "/comparisons",
    label: "Comparisons",
    description: "Compare architecture across analysis runs.",
    icon: "M8 3v18 M16 3v18 M3 8h9 M12 16h9 M6 5 3 8l3 3 M18 13l3 3-3 3",
  },
  {
    href: "/repositories",
    label: "Repositories",
    description: "Connect GitHub and browse synced repositories.",
    icon: "M3 7V5h7l2 2h9v12H3z M8 13h8",
  },
] as const;
