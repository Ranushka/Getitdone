import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Public: creates a manager account with email/password. Anyone with the
// link can register — this is a private, unlisted tool, not a public app.
export async function POST(req: NextRequest) {
  const { name, email, password, repeatPassword } = await req.json();

  if (!name?.trim() || !email?.trim() || !password || !repeatPassword) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }
  if (password !== repeatPassword) {
    return NextResponse.json({ error: "Passwords don't match" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email: email.trim() } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: { name: name.trim(), email: email.trim(), password: hashed },
  });

  return NextResponse.json({ ok: true });
}
