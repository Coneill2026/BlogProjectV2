import type { APIRoute } from 'astro';
import { z } from 'astro/zod';

type FeedbackSubmission = {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
};

declare global {
  var __blog_feedback_store: FeedbackSubmission[] | undefined;
}

const feedbackSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().email('A valid email is required'),
  message: z.string().trim().min(1, 'Message is required'),
});

function createResponse(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function getFeedbackStore() {
  if (!globalThis.__blog_feedback_store) {
    globalThis.__blog_feedback_store = [];
  }

  return globalThis.__blog_feedback_store;
}

export const GET: APIRoute = async () => {
  return createResponse(200, {
    count: getFeedbackStore().length,
    submissions: getFeedbackStore(),
  });
};

export const POST: APIRoute = async ({ request }) => {
  let payload: unknown;

  try {
    const contentType = request.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      payload = await request.json();
    } else {
      const formData = await request.formData();
      payload = Object.fromEntries(formData.entries());
    }
  } catch {
    return createResponse(400, {
      success: false,
      error: 'Request payload must be valid JSON or form data.',
    });
  }

  const result = feedbackSchema.safeParse(payload);

  if (!result.success) {
    return createResponse(400, {
      success: false,
      error: 'Validation failed',
      details: result.error.flatten().fieldErrors,
    });
  }

  const submission: FeedbackSubmission = {
    id: crypto.randomUUID(),
    name: result.data.name,
    email: result.data.email,
    message: result.data.message,
    createdAt: new Date().toISOString(),
  };

  getFeedbackStore().unshift(submission);

  return createResponse(201, {
    success: true,
    message: 'Feedback received.',
    submission,
  });
};
