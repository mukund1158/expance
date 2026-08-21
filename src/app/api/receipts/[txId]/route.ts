import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { receiptAbsolutePath, receiptContentType } from "@/lib/receipts";

// Receipts are private financial documents: signed in AND a member of the
// transaction's space, or nothing.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ txId: string }> }
) {
  const { txId } = await params;
  const session = await auth();
  if (!session?.user) return new NextResponse(null, { status: 404 });

  const tx = await prisma.transaction.findFirst({
    where: {
      id: txId,
      receiptPath: { not: null },
      space: { members: { some: { userId: session.user.id } } },
    },
    select: { receiptPath: true },
  });
  if (!tx?.receiptPath) return new NextResponse(null, { status: 404 });

  try {
    const data = await readFile(receiptAbsolutePath(tx.receiptPath));
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": receiptContentType(tx.receiptPath),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
