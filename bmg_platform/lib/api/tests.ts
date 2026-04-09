import { apiClient } from "./client";

export type TestCategory = "competence" | "technical";
export type TestSubType = "profiling" | "psychotechnique" | "technique";
export type TestVisibility = "public" | "pack" | "personalized";
export type TestStatus = "draft" | "published" | "archived";
export type QuestionType = "mcq" | "true_false" | "open" | "ordering";

export interface AnswerOption {
  id: string;
  text: string;
  is_correct: boolean;
  order: number;
}

export interface Question {
  id: string;
  question_type: QuestionType;
  text: string;
  order: number;
  points: number;
  explanation: string;
  answer_options: AnswerOption[];
}

export interface TestModel {
  id: string;
  title: string;
  category: TestCategory;
  sub_type: TestSubType;
  visibility: TestVisibility;
  questions_per_session: number;
  timer_seconds: number | null;
  profile_count: number | null;
  pass_threshold_pct: number | null;
  status: TestStatus;
  version: number;
  parent_version_id: string | null;
  question_count: number;
  created_at: string;
  updated_at: string;
}

export interface PaginatedTests {
  count: number;
  next: string | null;
  previous: string | null;
  results: TestModel[];
}

export interface CreateTestPayload {
  title: string;
  category: TestCategory;
  sub_type: TestSubType;
  visibility: TestVisibility;
  questions_per_session: number;
  timer_seconds?: number | null;
  pass_threshold_pct?: number | null;
}

export interface CreateQuestionPayload {
  question_type: QuestionType;
  text: string;
  order: number;
  points: number;
  explanation?: string;
  answer_options: Array<{ text: string; is_correct: boolean; order: number }>;
}

export async function getTests(params?: {
  page?: number;
  category?: TestCategory;
  sub_type?: TestSubType;
  visibility?: TestVisibility;
  status?: TestStatus;
  search?: string;
}): Promise<PaginatedTests> {
  const sp = new URLSearchParams();
  if (params?.page) sp.set("page", String(params.page));
  if (params?.category) sp.set("category", params.category);
  if (params?.sub_type) sp.set("sub_type", params.sub_type);
  if (params?.visibility) sp.set("visibility", params.visibility);
  if (params?.status) sp.set("status", params.status);
  if (params?.search) sp.set("search", params.search);
  return apiClient.get(`api/v1/tests/?${sp}`).json<PaginatedTests>();
}

export async function getTest(id: string): Promise<TestModel> {
  return apiClient.get(`api/v1/tests/${id}/`).json<TestModel>();
}

export async function createTest(data: CreateTestPayload): Promise<TestModel> {
  return apiClient.post("api/v1/tests/", { json: data }).json<TestModel>();
}

export async function updateTest(id: string, data: Partial<CreateTestPayload>): Promise<TestModel> {
  return apiClient.patch(`api/v1/tests/${id}/`, { json: data }).json<TestModel>();
}

export async function publishTest(id: string): Promise<TestModel> {
  return apiClient.post(`api/v1/tests/${id}/publish/`).json<TestModel>();
}

export async function getQuestions(testId: string): Promise<Question[]> {
  return apiClient.get(`api/v1/tests/${testId}/questions/`).json<Question[]>();
}

export async function createQuestion(
  testId: string,
  data: CreateQuestionPayload
): Promise<Question> {
  return apiClient
    .post(`api/v1/tests/${testId}/questions/`, { json: data })
    .json<Question>();
}
