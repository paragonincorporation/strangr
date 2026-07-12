import { Badge, Button, Card, Input, Select, Skeleton } from "@paramingle/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { adminApi, adminSession } from "./api.js";

export function AdminLogin() {
  const [token, setToken] = useState("");
  const navigate = useNavigate();
  return (
    <main className="admin-login">
      <Card className="admin-login__card">
        <Badge tone="danger">Restricted system</Badge>
        <p className="admin-kicker">PARAMINGLE SAFETY OPERATIONS</p>
        <h1>Admin access.</h1>
        <p>
          Sign in through the dedicated Supabase admin project, complete MFA,
          then provide its short-lived AAL2 access token. User-app sessions are
          rejected.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            adminSession.set(token);
            void navigate("/admin");
          }}
        >
          <Input
            label="AAL2 access token"
            onChange={(event) => setToken(event.target.value)}
            type="password"
            value={token}
          />
          <Button disabled={token.length < 20} fullWidth type="submit">
            Open restricted workspace
          </Button>
        </form>
      </Card>
    </main>
  );
}

export function QueuePage() {
  const [purpose, setPurpose] = useState("Triage submitted safety reports");
  const cases = useQuery({
    queryKey: ["cases", purpose],
    queryFn: () =>
      adminApi<
        Array<{
          id: string;
          reason: string;
          priority: string;
          state: string;
          createdAt: string;
        }>
      >(`/v1/admin/cases?purpose=${encodeURIComponent(purpose)}`),
    enabled: purpose.length >= 8,
  });
  return (
    <div className="admin-stack">
      <header className="admin-heading">
        <div>
          <p className="admin-kicker">TRIAGE WORKSPACE</p>
          <h1>Case queue</h1>
          <p>
            Purpose-bound reports with minimum context. Every read is audited.
          </p>
        </div>
        <Badge tone="warning">MFA enforced</Badge>
      </header>
      <section aria-label="Queue filters" className="admin-filters">
        <Input
          label="Access purpose"
          onChange={(event) => setPurpose(event.target.value)}
          value={purpose}
        />
        <Select defaultValue="open" disabled label="State">
          <option value="open">Open</option>
          <option value="reviewing">Reviewing</option>
        </Select>
        <Select defaultValue="all" disabled label="Priority">
          <option value="all">All priorities</option>
        </Select>
      </section>
      {cases.error ? (
        <Card>
          <p role="alert">{cases.error.message}</p>
        </Card>
      ) : null}
      {cases.data?.map((item) => (
        <Card className="queue-card" key={item.id}>
          <div className="queue-card__header">
            <div>
              <Badge tone="danger">{item.priority}</Badge>
              <strong>{item.id}</strong>
            </div>
            <span>{item.state}</span>
          </div>
          <h2>{item.reason.replaceAll("_", " ")}</h2>
          <p>{new Date(item.createdAt).toLocaleString()}</p>
          <Link
            to={`/admin/cases/${item.id}?purpose=${encodeURIComponent(purpose)}`}
          >
            Open audited case →
          </Link>
        </Card>
      ))}
      {cases.isLoading ? (
        <div aria-label="Loading queue" className="admin-loading">
          <Skeleton height="5rem" />
          <Skeleton height="5rem" />
        </div>
      ) : null}
      {cases.data?.length === 0 ? (
        <Card>
          <h2>Queue clear</h2>
          <p>No cases match this view.</p>
        </Card>
      ) : null}
    </div>
  );
}

type LaunchCountry = {
  countryCode: string;
  registrationEnabled: boolean;
  matchingEnabled: boolean;
  billingEnabled: boolean;
  reasonCode: string;
};

export function LaunchCountriesPage() {
  const queryClient = useQueryClient();
  const [countryCode, setCountryCode] = useState("");
  const [reasonCode, setReasonCode] = useState("not_reviewed");
  const [registrationEnabled, setRegistrationEnabled] = useState(false);
  const [matchingEnabled, setMatchingEnabled] = useState(false);
  const [billingEnabled, setBillingEnabled] = useState(false);
  const [purpose, setPurpose] = useState("Review country launch controls");
  const countries = useQuery({
    queryKey: ["launch-countries"],
    queryFn: () => adminApi<LaunchCountry[]>("/v1/admin/launch-countries"),
  });
  const update = useMutation({
    mutationFn: () =>
      adminApi<LaunchCountry>(
        `/v1/admin/launch-countries/${encodeURIComponent(countryCode.trim().toUpperCase())}`,
        {
          method: "PUT",
          body: JSON.stringify({
            registrationEnabled,
            matchingEnabled,
            billingEnabled,
            reasonCode,
            purpose,
          }),
        },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["launch-countries"] });
    },
  });
  return (
    <div className="admin-stack">
      <header className="admin-heading">
        <div>
          <p className="admin-kicker">DENY BY DEFAULT</p>
          <h1>Launch countries</h1>
          <p>
            Registration, random matching, and billing are separate switches.
            Every change requires recent MFA and creates an audit record.
          </p>
        </div>
        <Badge tone="warning">Legal approval required</Badge>
      </header>
      <Card>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            update.mutate();
          }}
        >
          <Input
            label="ISO country code"
            maxLength={2}
            minLength={2}
            onChange={(event) => setCountryCode(event.target.value)}
            pattern="[A-Za-z]{2}"
            required
            value={countryCode}
          />
          <Input
            label="Reason code"
            maxLength={80}
            minLength={2}
            onChange={(event) => setReasonCode(event.target.value)}
            required
            value={reasonCode}
          />
          <Input
            label="Audit purpose"
            minLength={8}
            onChange={(event) => setPurpose(event.target.value)}
            required
            value={purpose}
          />
          <label>
            <input
              checked={registrationEnabled}
              onChange={(event) => setRegistrationEnabled(event.target.checked)}
              type="checkbox"
            />{" "}
            Registration enabled
          </label>
          <label>
            <input
              checked={matchingEnabled}
              onChange={(event) => setMatchingEnabled(event.target.checked)}
              type="checkbox"
            />{" "}
            Random matching enabled
          </label>
          <label>
            <input
              checked={billingEnabled}
              onChange={(event) => setBillingEnabled(event.target.checked)}
              type="checkbox"
            />{" "}
            Billing enabled
          </label>
          <Button
            disabled={
              update.isPending ||
              !/^[A-Za-z]{2}$/.test(countryCode) ||
              purpose.length < 8
            }
            type="submit"
            variant="danger"
          >
            Save audited controls
          </Button>
        </form>
        {update.error ? <p role="alert">{update.error.message}</p> : null}
      </Card>
      {countries.data?.map((country) => (
        <Card key={country.countryCode}>
          <h2>{country.countryCode}</h2>
          <p>{country.reasonCode}</p>
          <p>
            Registration: {country.registrationEnabled ? "on" : "off"} ·
            Matching: {country.matchingEnabled ? "on" : "off"} · Billing:{" "}
            {country.billingEnabled ? "on" : "off"}
          </p>
        </Card>
      ))}
    </div>
  );
}

export function CasePage() {
  const { caseId = "unknown" } = useParams();
  const purpose =
    new URLSearchParams(location.search).get("purpose") ??
    "Review assigned safety report";
  const [reveal, setReveal] = useState(false);
  const detail = useQuery({
    queryKey: ["case", caseId, purpose, reveal],
    queryFn: () =>
      adminApi<{
        reason: string;
        note: string | null;
        priority: string;
        state: string;
        evidence: Array<{ id: string; excerpt: string }>;
      }>(
        `/v1/admin/cases/${caseId}?purpose=${encodeURIComponent(purpose)}&revealEvidence=${reveal}`,
      ),
  });
  return (
    <div className="admin-stack">
      <header className="admin-heading">
        <div>
          <p className="admin-kicker">CASE · {caseId.toUpperCase()}</p>
          <h1>Minimum necessary context.</h1>
          <p>
            Evidence is hidden by default and each reveal creates an audit
            event.
          </p>
        </div>
        <Badge>{detail.data?.state ?? "Loading"}</Badge>
      </header>
      <div className="case-grid">
        <Card>
          <p className="admin-kicker">REPORT SUMMARY</p>
          <h2>
            {detail.data?.reason?.replaceAll("_", " ") ?? "Loading report"}
          </h2>
          <p>{detail.data?.note ?? "No reporter note supplied."}</p>
          <Button onClick={() => setReveal(true)}>
            Reveal minimum evidence
          </Button>
          {detail.data?.evidence.map((item) => (
            <blockquote key={item.id}>{item.excerpt}</blockquote>
          ))}
        </Card>
        <Card>
          <p className="admin-kicker">AVAILABLE ACTIONS</p>
          <h2>Role and reauthentication protected</h2>
          <p>
            Sanctions require a documented reason, evidence for permanent
            action, a sufficiently privileged role, recent MFA, and a successful
            audit write.
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

export function AppealsPage() {
  const purpose = "Independent appeal review";
  const appeals = useQuery({
    queryKey: ["appeals"],
    queryFn: () =>
      adminApi<
        Array<{
          id: string;
          sanctionId: string;
          state: string;
          createdAt: string;
        }>
      >(`/v1/admin/appeals?purpose=${encodeURIComponent(purpose)}`),
  });
  return (
    <div className="admin-stack">
      <header className="admin-heading">
        <div>
          <p className="admin-kicker">SECOND REVIEW</p>
          <h1>Appeals</h1>
          <p>The sanctioning operator cannot review the same appeal.</p>
        </div>
      </header>
      {appeals.data?.map((item) => (
        <Card key={item.id}>
          <Badge>{item.state}</Badge>
          <h2>Appeal {item.id}</h2>
          <p>Sanction {item.sanctionId}</p>
        </Card>
      ))}
      {appeals.data?.length === 0 ? (
        <Card>
          <h2>No pending appeals</h2>
        </Card>
      ) : null}
      {appeals.error ? <p role="alert">{appeals.error.message}</p> : null}
    </div>
  );
}
