export type SandboxTier = "env_var" | "home_wrapper";

export interface ToolSandboxEntry {
  id: string;
  name: string;
  binaries: string[];
  tier: SandboxTier;
  envOverrides?: Record<string, string>;
  homeConfigPaths?: string[];
  enabledByDefault: boolean;
}

export class SandboxRegistry {
  private readonly entries: Map<string, ToolSandboxEntry>;
  private readonly binaryIndex: Map<string, string>;

  constructor(entries: readonly ToolSandboxEntry[]) {
    this.entries = new Map();
    this.binaryIndex = new Map();
    for (const entry of entries) {
      this.entries.set(entry.id, entry);
      for (const bin of entry.binaries) {
        this.binaryIndex.set(bin, entry.id);
      }
    }
  }

  isWhitelisted(binaryName: string): boolean {
    return this.binaryIndex.has(binaryName);
  }

  getEntryForBinary(binaryName: string): ToolSandboxEntry | undefined {
    const id = this.binaryIndex.get(binaryName);
    return id !== undefined ? this.entries.get(id) : undefined;
  }

  getById(id: string): ToolSandboxEntry | undefined {
    return this.entries.get(id);
  }

  getEnabledEntries(): ToolSandboxEntry[] {
    return [...this.entries.values()].filter((e) => e.enabledByDefault);
  }

  getAllEntries(): ToolSandboxEntry[] {
    return [...this.entries.values()];
  }
}
