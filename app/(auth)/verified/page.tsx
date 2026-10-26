import type { Metadata } from "next"
import Link from "next/link"
import { CircleCheck, CircleX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { getSession } from "@/lib/session"

export const metadata: Metadata = { title: "Επιβεβαίωση e-mail" }

// Where the e-mail confirmation link lands (Better Auth redirects here, with ?error=… on failure).
export default async function VerifiedPage({ searchParams }: PageProps<"/verified">) {
  const { error } = await searchParams
  const session = await getSession()
  const ok = !error && session?.user.emailVerified

  return (
    <Card>
      <CardHeader className="text-center">
        {ok ? <CircleCheck className="mx-auto mb-2 size-10 text-primary" /> : <CircleX className="mx-auto mb-2 size-10 text-destructive" />}
        <CardTitle className="font-heading text-xl">{ok ? "Ο λογαριασμός σας ενεργοποιήθηκε" : "Η επιβεβαίωση δεν ολοκληρώθηκε"}</CardTitle>
        <CardDescription>
          {ok
            ? "Ευχαριστούμε! Μπορείτε πλέον να προτείνετε νέες εκκλησίες και διορθώσεις."
            : "Ο σύνδεσμος δεν είναι έγκυρος ή έχει λήξει. Συνδεθείτε με το e-mail και τον κωδικό σας και θα σας στείλουμε νέο σύνδεσμο."}
        </CardDescription>
      </CardHeader>
      <CardFooter className="justify-center">
        <Button asChild><Link href={ok ? "/admin" : "/login"}>{ok ? "Συνέχεια" : "Σύνδεση"}</Link></Button>
      </CardFooter>
    </Card>
  )
}
