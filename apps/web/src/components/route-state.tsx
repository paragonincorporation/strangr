import { Button, Card, Skeleton } from "@paramingle/ui";

type RouteStateKind = "loading" | "empty" | "offline" | "forbidden" | "error";

const content: Record<
  Exclude<RouteStateKind, "loading">,
  { title: string; copy: string }
> = {
  empty: {
    title: "Nothing here yet.",
    copy: "When this space has something to show, it will appear here.",
  },
  offline: {
    title: "You’re offline.",
    copy: "Reconnect to refresh this space. Active safety controls remain available.",
  },
  forbidden: {
    title: "This space is unavailable.",
    copy: "Your current account state does not allow access.",
  },
  error: {
    title: "Couldn’t load this.",
    copy: "The request failed safely. Try once more.",
  },
};

export function RouteState({
  kind,
  onRetry,
}: {
  kind: RouteStateKind;
  onRetry?: () => void;
}) {
  if (kind === "loading") {
    return (
      <div
        aria-label="Loading content"
        className="route-skeleton"
        role="status"
      >
        <Skeleton height="3rem" width="55%" />
        <Skeleton height="9rem" />
        <Skeleton height="9rem" />
      </div>
    );
  }
  return (
    <Card className="route-state">
      <span aria-hidden="true">
        {kind === "offline" ? "↯" : kind === "forbidden" ? "×" : "·"}
      </span>
      <h2>{content[kind].title}</h2>
      <p>{content[kind].copy}</p>
      {onRetry ? (
        <Button onClick={onRetry} variant="secondary">
          Try again
        </Button>
      ) : null}
    </Card>
  );
}
