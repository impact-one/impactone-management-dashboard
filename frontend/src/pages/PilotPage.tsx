import { Button } from "@/components/ui/button";
import { Loading, PageHeader, RetryableError } from "../components/PageHeader";
import { MarkIcon } from "../components/marks";
import { CardGrid, Panel, RecordCard, Section } from "../components/Surface";
import { useApi } from "../lib/useApi";
import type { Envelope, Proposal } from "../types";

export function PilotPage() {
  const { data, error, loading, reload } = useApi<Envelope<Proposal>>("/proposal");
  const proposal = data?.data;

  return (
    <>
      <PageHeader
        eyebrow="For Mikolaj"
        title="Pilot notes"
        lede="Architecture, access, LibreChat, cost, and the assumptions that still need a yes. This is a prototype, not a production commitment."
      />
      {loading && !proposal ? <Loading label="Loading pilot notes" /> : null}
      {error ? <RetryableError message={error} onRetry={reload} /> : null}
      {proposal ? (
        <>
          <nav
            className="sticky top-14 z-10 -mx-4 mb-4 flex flex-wrap gap-2 border-b bg-background/95 px-4 py-2 backdrop-blur-md md:-mx-6 md:px-6"
            aria-label="Pilot notes sections"
          >
            {[
              ["#access", "Access"],
              ["#architecture", "Architecture"],
              ["#librechat", "LibreChat"],
              ["#cost", "Cost"],
              ["#next", "Next stage"],
              ["#assumptions", "Assumptions"],
            ].map(([href, label]) => (
              <Button key={href} variant="outline" size="sm" asChild>
                <a href={href}>{label}</a>
              </Button>
            ))}
          </nav>

          <Section id="access" title="Access model">
            <CardGrid>
              {proposal.accessModel.map((item) => (
                <li key={item.role}>
                  <RecordCard kicker="Role" title={item.role} summary={item.access} mark={<MarkIcon name={item.role} />} />
                </li>
              ))}
            </CardGrid>
          </Section>
          <Section id="architecture" title="Architecture">
            <CardGrid>
              {proposal.architecture.map((item) => (
                <li key={item.title}>
                  <RecordCard
                    kicker="Layer"
                    title={item.title}
                    summary={item.detail}
                    mark={<MarkIcon name={item.title} />}
                  />
                </li>
              ))}
            </CardGrid>
          </Section>
          <Section id="librechat" title="LibreChat">
            <Panel title={proposal.libreChat.verdict}>
              <ul className="divide-y">
                {proposal.libreChat.points.map((point) => (
                  <li key={point} className="px-4 py-3 text-sm leading-6 text-foreground">
                    {point}
                  </li>
                ))}
              </ul>
            </Panel>
          </Section>
          <Section id="cost" title="Cost estimate">
            <CardGrid>
              {proposal.costs.map((item) => (
                <li key={item.name}>
                  <RecordCard
                    kicker="Estimate"
                    title={item.name}
                    summary={item.note}
                    mark={<MarkIcon name={item.name} />}
                    fields={[{ label: "Range", value: item.estimate }]}
                  />
                </li>
              ))}
            </CardGrid>
          </Section>
          <Section id="next" title="Next stage, after approval">
            <Panel title="Sequence">
              <ol className="divide-y">
                {proposal.nextStage.map((item, index) => (
                  <li key={item} className="flex gap-3 px-4 py-3 text-sm leading-6 text-foreground">
                    <span className="grid size-6 shrink-0 place-items-center rounded-md bg-accent text-xs font-semibold text-primary">
                      {index + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </Panel>
          </Section>
          <div id="assumptions" className="mt-8 grid gap-4 lg:grid-cols-2">
            <Panel title="Assumptions to confirm">
              <ul className="divide-y">
                {proposal.assumptions.map((item) => (
                  <li key={item} className="px-4 py-3 text-sm leading-6 text-foreground">
                    {item}
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel title="Risks and limits">
              <ul className="divide-y">
                {proposal.risks.map((item) => (
                  <li key={item} className="px-4 py-3 text-sm leading-6 text-foreground">
                    {item}
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </>
      ) : null}
    </>
  );
}
