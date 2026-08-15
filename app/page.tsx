import { getDeployedCommit } from "@/lib/deployed-commit";

export default function Home() {
  const { sha, short, isLocal } = getDeployedCommit();

  return (
    <main>
      <h1>Retroactive Horoscope</h1>
      <p>
        A deployment-lifecycle exercise. This page exists to prove that a
        push to <code>main</code> reaches production without hand-holding.
      </p>
      <p>
        {isLocal ? (
          <>Running a local development build (no deployed commit).</>
        ) : (
          <>
            Deployed commit: <code title={sha}>{short}</code>
          </>
        )}
      </p>
    </main>
  );
}
