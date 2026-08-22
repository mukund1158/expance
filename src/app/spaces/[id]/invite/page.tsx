import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { requireMembership } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { baseUrl, newInviteToken } from "@/lib/invite";
import { RegenerateButton } from "./RegenerateButton";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { membership, space } = await requireMembership(id);
  if (membership.role !== "OWNER") notFound();

  // Older spaces were created before invite tokens existed — mint one now.
  let token = space.inviteToken;
  if (!token) {
    token = newInviteToken();
    await prisma.space.update({
      where: { id },
      data: { inviteToken: token },
    });
  }

  const inviteUrl = `${await baseUrl()}/join/${token}`;
  const svg = await QRCode.toString(inviteUrl, {
    type: "svg",
    margin: 0,
    color: { dark: "#211e18", light: "#ffffff" },
  });

  return (
    <main className="mx-auto w-full max-w-lg p-5 pb-16">
      <header className="mb-6">
        <Link href={`/spaces/${id}`} className="text-sm text-ink-muted">
          ← {space.name}
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Invite with QR</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Anyone who scans this joins <strong className="text-ink">{space.name}</strong> —
          they create an account on the spot if they don&apos;t have one.
        </p>
      </header>

      <div className="rounded-xl border border-line bg-paper-raised p-5">
        {/* White tile behind the QR so it scans in dark mode too */}
        <div
          className="mx-auto w-56 rounded-lg bg-white p-3 [&>svg]:h-auto [&>svg]:w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <p className="amount mt-4 break-all text-center text-xs text-ink-muted">
          {inviteUrl}
        </p>
      </div>

      <div className="mt-4 space-y-3">
        <RegenerateButton spaceId={id} />
        <p className="text-xs text-ink-muted">
          Treat the QR like a key to this space: share it only with people who
          belong here, and regenerate it if it leaks or someone screenshots it
          who shouldn&apos;t have.
        </p>
      </div>
    </main>
  );
}
