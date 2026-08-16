import { parse } from "yaml";

/**
 * With previews sharing the production database (Sprint 5, R1), this
 * condition is the only thing standing between an unreviewed branch and
 * the production schema -- R2 exists specifically so that fact is
 * enforced by a failing test, not by someone reading the YAML and
 * trusting it.
 */
export const REQUIRED_MIGRATE_GATE =
  "github.ref == 'refs/heads/main' && github.event_name == 'push'";

export function migrateJobCondition(workflowYaml: string): unknown {
  const doc = parse(workflowYaml);
  return doc?.jobs?.migrate?.if;
}
