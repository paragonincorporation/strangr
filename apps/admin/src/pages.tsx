import { Badge, Button, Card, Input, Select, Skeleton } from "@paramingle/ui";
import { Link, useParams } from "react-router-dom";

export function AdminLogin() {
  return (
    <main className="admin-login">
      <Card className="admin-login__card">
        <Badge tone="danger">Restricted system</Badge>
        <p className="admin-kicker">PARAMINGLE SAFETY OPERATIONS</p>
        <h1>Admin access.</h1>
        <p>
          Authentication and mandatory MFA arrive in Unit 19. This separate
          shell does not accept credentials yet.
        </p>
        <form onSubmit={(event) => event.preventDefault()}>
          <Input
            disabled
            label="Work email"
            placeholder="operator@paramingle"
            type="email"
          />
          <Input disabled label="Password" type="password" />
          <Button disabled fullWidth type="submit">
            Continue to MFA
          </Button>
        </form>
        <Link to="/admin">Preview authorized workspace →</Link>
      </Card>
    </main>
  );
}

export function QueuePage() {
  return (
    <div className="admin-stack">
      <header className="admin-heading">
        <div>
          <p className="admin-kicker">TRIAGE WORKSPACE</p>
          <h1>Case queue</h1>
          <p>
            Interface-only sample data. No reports or personal data are loaded.
          </p>
        </div>
        <Badge tone="warning">Authorization pending</Badge>
      </header>
      <section aria-label="Queue filters" className="admin-filters">
        <Input disabled label="Search safe case ID" placeholder="CASE-…" />
        <Select defaultValue="open" disabled label="State">
          <option value="open">Open</option>
          <option value="reviewing">Reviewing</option>
        </Select>
        <Select defaultValue="all" disabled label="Priority">
          <option value="all">All priorities</option>
        </Select>
      </section>
      <Card className="queue-card">
        <div className="queue-card__header">
          <div>
            <Badge tone="danger">P1 sample</Badge>
            <strong>CASE-PREVIEW</strong>
          </div>
          <span>Unassigned</span>
        </div>
        <h2>Report context remains purpose-bound.</h2>
        <p>
          The real queue will show reason, age, and assignment only when the
          operator’s role and case purpose permit it.
        </p>
        <Link to="/admin/cases/preview">Open interface preview →</Link>
      </Card>
      <div aria-label="Loading queue example" className="admin-loading">
        <Skeleton height="5rem" />
        <Skeleton height="5rem" />
      </div>
    </div>
  );
}

export function CasePage() {
  const { caseId = "unknown" } = useParams();
  return (
    <div className="admin-stack">
      <header className="admin-heading">
        <div>
          <p className="admin-kicker">CASE · {caseId.toUpperCase()}</p>
          <h1>Minimum necessary context.</h1>
          <p>
            Evidence reveal and sanctions are intentionally disabled until role
            authorization and append-only audit exist.
          </p>
        </div>
        <Badge>Interface preview</Badge>
      </header>
      <div className="case-grid">
        <Card>
          <p className="admin-kicker">REPORT SUMMARY</p>
          <h2>No report loaded</h2>
          <p>
            This placeholder proves the case route without exposing a casual
            “view everything” surface.
          </p>
        </Card>
        <Card>
          <p className="admin-kicker">AVAILABLE ACTIONS</p>
          <h2>Fail closed</h2>
          <p>
            Privileged controls will remain unavailable whenever MFA,
            permission, purpose, or audit writing is missing.
          </p>
          <Button disabled variant="danger">
            Apply sanction
          </Button>
        </Card>
      </div>
    </div>
  );
}

export function AdminPage({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="admin-stack">
      <header className="admin-heading">
        <div>
          <p className="admin-kicker">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </header>
      <Card className="admin-empty">
        <span>·</span>
        <h2>Not connected yet.</h2>
        <p>
          The interface boundary is ready; server authorization and audit must
          land before data.
        </p>
      </Card>
    </div>
  );
}
