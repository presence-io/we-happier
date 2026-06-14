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
  private readonly blockedIds: ReadonlySet<string>;

  constructor(
    entries: readonly ToolSandboxEntry[],
    blockedIds?: ReadonlySet<string>,
  ) {
    this.entries = new Map();
    this.binaryIndex = new Map();
    this.blockedIds = blockedIds ?? new Set();
    for (const entry of entries) {
      this.entries.set(entry.id, entry);
      for (const bin of entry.binaries) {
        this.binaryIndex.set(bin, entry.id);
      }
    }
  }

  withPolicy(disabledTools: readonly string[]): SandboxRegistry {
    return new SandboxRegistry(
      [...this.entries.values()],
      new Set(disabledTools),
    );
  }

  isWhitelisted(binaryName: string): boolean {
    return this.binaryIndex.has(binaryName);
  }

  isBlocked(binaryName: string): boolean {
    const id = this.binaryIndex.get(binaryName);
    return id !== undefined && this.blockedIds.has(id);
  }

  isToolBlocked(toolId: string): boolean {
    return this.blockedIds.has(toolId);
  }

  getEntryForBinary(binaryName: string): ToolSandboxEntry | undefined {
    const id = this.binaryIndex.get(binaryName);
    return id !== undefined ? this.entries.get(id) : undefined;
  }

  getById(id: string): ToolSandboxEntry | undefined {
    return this.entries.get(id);
  }

  getEnabledEntries(): ToolSandboxEntry[] {
    return [...this.entries.values()].filter(
      (e) => e.enabledByDefault && !this.blockedIds.has(e.id),
    );
  }

  getBlockedEntries(): ToolSandboxEntry[] {
    return [...this.entries.values()].filter(
      (e) => e.enabledByDefault && this.blockedIds.has(e.id),
    );
  }

  getAllEntries(): ToolSandboxEntry[] {
    return [...this.entries.values()];
  }

  getBlockedIds(): ReadonlySet<string> {
    return this.blockedIds;
  }
}
