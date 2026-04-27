import { NextResponse } from "next/server";
import { dashboardSessionCookieName } from "../../../../../src/lib/dashboard-auth";

export async function POST() {
  const response = NextResponse.json(
    {
      status: "logged_out"
    },
    { status: 200 }
  );

  response.cookies.set({
    name: dashboardSessionCookieName,
    value: "",
    maxAge: 0,
    path: "/"
  });

  return response;
}

