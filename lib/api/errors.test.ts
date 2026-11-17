import type { NextApiResponse } from "next";

import assert from "node:assert/strict";
import test from "node:test";

import {
  DocumentError,
  TeamError,
  errorResponse,
  errorhandler,
} from "@/lib/errorHandler";

import { API_ERROR_STATUS_CODES, PapermarkApiError } from "./errors";

function responseFixture() {
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    end(body: string) {
      this.body = body;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
  return { response, nextResponse: response as unknown as NextApiResponse };
}

test("typed API errors retain their code, HTTP status and Error identity", () => {
  const error = new PapermarkApiError(
    "unprocessable_entity",
    "The document URL is invalid.",
  );
  assert.ok(error instanceof Error);
  assert.ok(error instanceof PapermarkApiError);
  assert.equal(error.name, "PapermarkApiError");
  assert.equal(error.code, "unprocessable_entity");
  assert.equal(error.statusCode, 422);
  assert.equal(error.message, "The document URL is invalid.");
  assert.equal(API_ERROR_STATUS_CODES.unauthorized, 401);
  assert.equal(API_ERROR_STATUS_CODES.forbidden, 403);
});

test("invalid runtime codes fail closed instead of producing an invalid or successful HTTP status", () => {
  for (const code of ["constructor", "toString", "unknown", undefined]) {
    const error = Reflect.construct(PapermarkApiError, [
      code,
      "private diagnostic",
    ]);
    assert.equal(error.code, "internal_server_error");
    assert.equal(error.statusCode, 500);
    assert.equal(error.message, "Internal Server Error");
  }
});

test("Pages and App Router handlers preserve the intended URL-validation422", async () => {
  const error = new PapermarkApiError(
    "unprocessable_entity",
    "This document URL is not publicly available.",
  );
  const { response, nextResponse } = responseFixture();
  errorhandler(error, nextResponse);
  assert.equal(response.statusCode, 422);
  assert.equal(response.body, error.message);
  const appResponse = errorResponse(error);
  assert.equal(appResponse.status, 422);
  assert.equal(await appResponse.text(), error.message);
});

test("typed server failures do not expose their diagnostic message in either handler", async () => {
  const error = new PapermarkApiError(
    "internal_server_error",
    "private diagnostic",
  );
  const { response, nextResponse } = responseFixture();
  errorhandler(error, nextResponse);
  assert.equal(response.statusCode, 500);
  assert.equal(response.body, "Internal Server Error");
  assert.equal(await errorResponse(error).text(), "Internal Server Error");
});

test("existing document and team error responses remain unchanged", async () => {
  for (const error of [
    new DocumentError("Invalid document"),
    new TeamError("Invalid team"),
  ]) {
    const { response, nextResponse } = responseFixture();
    errorhandler(error, nextResponse);
    assert.equal(response.statusCode, 400);
    assert.equal(response.body, error.message);
    assert.equal(errorResponse(error).status, 400);
    assert.equal(await errorResponse(error).text(), error.message);
  }
});
