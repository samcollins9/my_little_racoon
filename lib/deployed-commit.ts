export type DeployedCommit = {
  sha: string;
  short: string;
  isLocal: boolean;
};

const LOCAL_FALLBACK_SHA = "local-dev";

/**
 * Vercel sets VERCEL_GIT_COMMIT_SHA on every deployment. Nothing sets it in
 * local development, so callers get an explicit local fallback instead of an
 * empty string, this is what R6 in the sprint-1 requirements calls "a
 * documented fallback for local development."
 */
export function getDeployedCommit(
  source: Record<string, string | undefined> = process.env
): DeployedCommit {
  const sha = source.VERCEL_GIT_COMMIT_SHA;

  if (!sha) {
    return { sha: LOCAL_FALLBACK_SHA, short: LOCAL_FALLBACK_SHA, isLocal: true };
  }

  return { sha, short: sha.slice(0, 7), isLocal: false };
}
