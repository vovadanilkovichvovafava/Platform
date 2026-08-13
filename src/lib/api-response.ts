import { NextResponse } from "next/server"
import { z } from "zod"

/**
 * Стандартизированные типы ошибок API
 */
export type ApiErrorType =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "CONFLICT"
  | "INTERNAL_ERROR"

interface ApiErrorResponse {
  error: string
  type: ApiErrorType
  details?: unknown
}

interface ApiSuccessResponse<T> {
  data: T
  message?: string
}

/**
 * Создаёт успешный ответ API
 */
export function successResponse<T>(data: T, message?: string, status = 200) {
  const response: ApiSuccessResponse<T> = { data }
  if (message) response.message = message
  return NextResponse.json(response, { status })
}

/**
 * Создаёт ответ с ошибкой
 */
export function errorResponse(
  message: string,
  type: ApiErrorType,
  status: number,
  details?: unknown
) {
  const response: ApiErrorResponse = { error: message, type }
  if (details) response.details = details
  return NextResponse.json(response, { status })
}

/**
 * Обрабатывает ошибки в API роутах
 */
export function handleApiError(error: unknown, context?: string): NextResponse {
  // Ошибки валидации Zod
  if (error instanceof z.ZodError) {
    return errorResponse(
      error.errors[0].message,
      "VALIDATION_ERROR",
      400,
      error.errors
    )
  }

  // Prisma ошибки
  if (isPrismaError(error)) {
    const prismaError = error as PrismaError

    // Уникальное ограничение
    if (prismaError.code === "P2002") {
      return errorResponse(
        "Запись с такими данными уже существует",
        "CONFLICT",
        409
      )
    }

    // Запись не найдена
    if (prismaError.code === "P2025") {
      return errorResponse(
        "Запись не найдена",
        "NOT_FOUND",
        404
      )
    }
  }

  // Логируем неизвестные ошибки
  console.error(`[API Error]${context ? ` ${context}:` : ""}`, error)

  return errorResponse(
    "Произошла внутренняя ошибка сервера",
    "INTERNAL_ERROR",
    500
  )
}

interface PrismaError {
  code: string
  meta?: Record<string, unknown>
}

function isPrismaError(error: unknown): error is PrismaError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as PrismaError).code === "string" &&
    (error as PrismaError).code.startsWith("P")
  )
}

/**
 * Хелпер для проверки авторизации
 */
export function unauthorizedResponse(message = "Не авторизован") {
  return errorResponse(message, "UNAUTHORIZED", 401)
}

/**
 * Хелпер для проверки прав доступа
 */
export function forbiddenResponse(message = "Доступ запрещён") {
  return errorResponse(message, "FORBIDDEN", 403)
}

/**
 * Хелпер для ненайденных ресурсов
 */
export function notFoundResponse(resource = "Ресурс") {
  return errorResponse(`${resource} не найден`, "NOT_FOUND", 404)
}
