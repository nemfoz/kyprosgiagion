/** "An El Frank Foundation project · powered by hnf.sh" (the Foundation's name linked when its address is set). */
export function FooterCredits({ foundationUrl, project, poweredBy, className }: {
  foundationUrl: string; project: string; poweredBy: string; className?: string
}) {
  // `project` has a \0 where the Foundation's name goes, so the name can be a link inside the translated sentence.
  const [before, after = ""] = project.split("\u0000")
  const name = foundationUrl
    ? <a href={foundationUrl} target="_blank" rel="noopener" className="font-medium text-foreground hover:text-primary">El Frank Foundation</a>
    : <span className="font-medium text-foreground">El Frank Foundation</span>
  return (
    <p className={className ?? "text-muted-foreground"}>
      {before}{name}{after}
      <span aria-hidden className="mx-2">·</span>
      {poweredBy} <a href="https://hnf.sh" target="_blank" rel="noopener" className="font-medium text-foreground hover:text-primary">hnf.sh</a>
    </p>
  )
}
