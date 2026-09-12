import { useNavigate } from "react-router-dom";

/**
 * The whole-screen states every guarded route needs [FR-19, AC-18, AC-27].
 *
 * A route the current role may not reach renders an explanation with a way
 * back, not a blank page and not a redirect that pretends the address does not
 * exist. Each panel carries distinguishable text so a test can tell forbidden
 * from not-found from a slice that has not shipped yet.
 */

interface ScreenPanelProps {
  title: string;
  description: string;
  testId: string;
  backTo?: string;
  backLabel?: string;
}

export function ScreenPanel({
  title,
  description,
  testId,
  backTo,
  backLabel = "Go back",
}: ScreenPanelProps) {
  const navigate = useNavigate();

  return (
    <div className="zg-card p-4 text-center" data-testid={testId}>
      <h2 className="h5 mb-2">{title}</h2>
      <p className="text-muted mb-3">{description}</p>
      <button
        className="btn btn-zen-secondary"
        onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
        type="button"
      >
        {backLabel}
      </button>
    </div>
  );
}

export function Forbidden({ backTo }: { backTo: string }) {
  return (
    <ScreenPanel
      backLabel="Back to my tickets"
      backTo={backTo}
      description="Your role does not have access to this screen. The server refuses the request as well, whatever the browser shows."
      testId="forbidden-panel"
      title="You do not have access to this page"
    />
  );
}

export function NotFound({ backTo }: { backTo: string }) {
  return (
    <ScreenPanel
      backLabel="Back to my tickets"
      backTo={backTo}
      description="The address you followed does not match any screen in TokTickIT."
      testId="not-found-panel"
      title="Page not found"
    />
  );
}
