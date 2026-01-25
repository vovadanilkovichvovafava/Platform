// Парсер для XML формата

import {
  ParsedTrail,
  ParsedModule,
  ParsedQuestion,
  ParseResult,
  generateSlug,
  detectModuleType,
  detectRequiresSubmission,
  detectColor,
  detectIcon,
} from "../types"

// Простой XML парсер (без зависимостей)
interface XmlNode {
  tag: string
  attributes: Record<string, string>
  children: XmlNode[]
  text: string
}

// Парсинг XML файла
export function parseXml(text: string): ParseResult {
  const warnings: string[] = []
  const errors: string[] = []

  try {
    const root = parseXmlString(text)
    const trails = convertXmlToTrails(root, warnings)

    return {
      success: trails.length > 0,
      trails,
      warnings,
      errors,
      parseMethod: "code",
    }
  } catch (e) {
    errors.push(`Ошибка парсинга XML: ${e}`)
    return {
      success: false,
      trails: [],
      warnings,
      errors,
      parseMethod: "code",
    }
  }
}

// Простой XML парсер
function parseXmlString(xml: string): XmlNode {
  // Удаление XML декларации и комментариев
  xml = xml.replace(/<\?xml[^?]*\?>/g, "")
  xml = xml.replace(/<!--[\s\S]*?-->/g, "")
  xml = xml.trim()

  const stack: XmlNode[] = []
  const root: XmlNode = { tag: "root", attributes: {}, children: [], text: "" }
  stack.push(root)

  // Регулярка для тегов
  const tagRegex = /<\/?([a-zA-Zа-яёА-ЯЁ_][\w\-.:а-яёА-ЯЁ]*)(\s[^>]*)?\/?>/g
  let lastIndex = 0
  let match

  while ((match = tagRegex.exec(xml)) !== null) {
    const [fullMatch, tagName, attrString] = match
    const isClosing = fullMatch.startsWith("</")
    const isSelfClosing = fullMatch.endsWith("/>")

    // Текст между тегами
    const textBefore = xml.substring(lastIndex, match.index).trim()
    if (textBefore && stack.length > 0) {
      stack[stack.length - 1].text += textBefore
    }

    if (isClosing) {
      // Закрывающий тег
      if (stack.length > 1) {
        stack.pop()
      }
    } else {
      // Открывающий тег
      const attributes: Record<string, string> = {}
      if (attrString) {
        const attrRegex = /([a-zA-Zа-яёА-ЯЁ_][\w\-.:а-яёА-ЯЁ]*)=["']([^"']*)["']/g
        let attrMatch
        while ((attrMatch = attrRegex.exec(attrString)) !== null) {
          attributes[attrMatch[1]] = attrMatch[2]
        }
      }

      const node: XmlNode = {
        tag: tagName.toLowerCase(),
        attributes,
        children: [],
        text: "",
      }

      stack[stack.length - 1].children.push(node)

      if (!isSelfClosing) {
        stack.push(node)
      }
    }

    lastIndex = match.index + fullMatch.length
  }

  return root
}

// Поиск элементов по тегу
function findElements(node: XmlNode, tagName: string): XmlNode[] {
  const results: XmlNode[] = []
  const lowerTag = tagName.toLowerCase()

  if (node.tag === lowerTag) {
    results.push(node)
  }

  for (const child of node.children) {
    results.push(...findElements(child, tagName))
  }

  return results
}

// Получение текста элемента
function getElementText(node: XmlNode, tagName: string): string {
  const elements = node.children.filter(c => c.tag === tagName.toLowerCase())
  if (elements.length > 0) {
    return elements[0].text.trim()
  }
  return ""
}

// Конвертация XML в trails
function convertXmlToTrails(root: XmlNode, warnings: string[]): ParsedTrail[] {
  const trails: ParsedTrail[] = []

  // Поиск trails
  const trailNodes = [
    ...findElements(root, "trail"),
    ...findElements(root, "трейл"),
    ...findElements(root, "course"),
    ...findElements(root, "курс"),
  ]

  for (const trailNode of trailNodes) {
    const trail = convertXmlTrail(trailNode, warnings)
    if (trail) trails.push(trail)
  }

  // Если trails не найдены, попробовать парсить как модули
  if (trails.length === 0) {
    const moduleNodes = [
      ...findElements(root, "module"),
      ...findElements(root, "модуль"),
      ...findElements(root, "lesson"),
      ...findElements(root, "урок"),
    ]

    if (moduleNodes.length > 0) {
      warnings.push("Trails не найдены - создан trail из модулей")
      const modules: ParsedModule[] = []

      for (const moduleNode of moduleNodes) {
        const mod = convertXmlModule(moduleNode, warnings)
        if (mod) modules.push(mod)
      }

      if (modules.length > 0) {
        trails.push({
          title: getElementText(root, "title") || getElementText(root, "название") || "Импортированный курс",
          slug: root.attributes.slug || generateSlug("imported-course"),
          subtitle: getElementText(root, "subtitle") || getElementText(root, "подзаголовок") || "",
          description: getElementText(root, "description") || getElementText(root, "описание") || "",
          icon: getElementText(root, "icon") || getElementText(root, "иконка") || "📚",
          color: getElementText(root, "color") || getElementText(root, "цвет") || "#6366f1",
          modules,
        })
      }
    }
  }

  return trails
}

// Конвертация XML trail
function convertXmlTrail(node: XmlNode, warnings: string[]): ParsedTrail | null {
  const title = getElementText(node, "title") || getElementText(node, "название") ||
    getElementText(node, "name") || node.attributes.title || node.attributes.name

  if (!title) {
    warnings.push("Trail без названия пропущен")
    return null
  }

  const trail: ParsedTrail = {
    title,
    slug: node.attributes.slug || getElementText(node, "slug") || generateSlug(title),
    subtitle: getElementText(node, "subtitle") || getElementText(node, "подзаголовок") || "",
    description: getElementText(node, "description") || getElementText(node, "описание") || "",
    icon: getElementText(node, "icon") || getElementText(node, "иконка") || detectIcon(title),
    color: getElementText(node, "color") || getElementText(node, "цвет") || detectColor(title),
    modules: [],
  }

  // Модули
  const moduleNodes = [
    ...node.children.filter(c => c.tag === "module" || c.tag === "модуль"),
    ...node.children.filter(c => c.tag === "lesson" || c.tag === "урок"),
  ]

  // Также ищем в контейнере modules/модули
  const modulesContainer = node.children.find(c =>
    c.tag === "modules" || c.tag === "модули" || c.tag === "lessons" || c.tag === "уроки"
  )
  if (modulesContainer) {
    moduleNodes.push(...modulesContainer.children.filter(c =>
      c.tag === "module" || c.tag === "модуль" || c.tag === "lesson" || c.tag === "урок"
    ))
  }

  for (const moduleNode of moduleNodes) {
    const mod = convertXmlModule(moduleNode, warnings)
    if (mod) trail.modules.push(mod)
  }

  return trail
}

// Конвертация XML модуля
function convertXmlModule(node: XmlNode, warnings: string[]): ParsedModule | null {
  const title = getElementText(node, "title") || getElementText(node, "название") ||
    getElementText(node, "name") || node.attributes.title || node.attributes.name

  if (!title) {
    warnings.push("Модуль без названия пропущен")
    return null
  }

  const content = getElementText(node, "content") || getElementText(node, "контент") ||
    getElementText(node, "содержимое") || getElementText(node, "text") || ""

  const typeStr = getElementText(node, "type") || getElementText(node, "тип") ||
    node.attributes.type || ""

  const typeMap: Record<string, "THEORY" | "PRACTICE" | "PROJECT"> = {
    lesson: "THEORY", theory: "THEORY", урок: "THEORY", теория: "THEORY",
    quiz: "PRACTICE", practice: "PRACTICE", тест: "PRACTICE", практика: "PRACTICE",
    project: "PROJECT", проект: "PROJECT",
  }

  // Вопросы
  const questionsNodes = [
    ...node.children.filter(c => c.tag === "questions" || c.tag === "вопросы"),
    ...node.children.filter(c => c.tag === "quiz" || c.tag === "тест"),
  ]

  const questions: ParsedQuestion[] = []
  for (const qContainer of questionsNodes) {
    for (const qNode of qContainer.children) {
      if (qNode.tag === "question" || qNode.tag === "вопрос" || qNode.tag === "q") {
        const question = convertXmlQuestion(qNode, warnings)
        if (question) questions.push(question)
      }
    }
  }

  // Также проверим прямые дочерние вопросы
  for (const child of node.children) {
    if (child.tag === "question" || child.tag === "вопрос" || child.tag === "q") {
      const question = convertXmlQuestion(child, warnings)
      if (question) questions.push(question)
    }
  }

  const type = typeMap[typeStr.toLowerCase()] ||
    (questions.length > 0 ? "PRACTICE" : detectModuleType(title, content))

  const pointsStr = getElementText(node, "points") || getElementText(node, "очки") ||
    getElementText(node, "баллы") || node.attributes.points

  // Определяем, требуется ли сдача работы
  const requiresSubmission = detectRequiresSubmission(type, title, content)

  return {
    title,
    slug: node.attributes.slug || getElementText(node, "slug") || generateSlug(title),
    type,
    points: pointsStr ? parseInt(pointsStr) : (type === "PROJECT" ? 100 : type === "PRACTICE" ? 75 : 50),
    description: getElementText(node, "description") || getElementText(node, "описание") || "",
    content,
    questions,
    level: getElementText(node, "level") || getElementText(node, "уровень") || node.attributes.level,
    duration: getElementText(node, "duration") || getElementText(node, "длительность") || node.attributes.duration,
    requiresSubmission,
  }
}

// Конвертация XML вопроса
function convertXmlQuestion(node: XmlNode, warnings: string[]): ParsedQuestion | null {
  const questionText = getElementText(node, "text") || getElementText(node, "текст") ||
    getElementText(node, "question") || getElementText(node, "вопрос") ||
    node.text.trim() || node.attributes.text

  if (!questionText) {
    warnings.push("Вопрос без текста пропущен")
    return null
  }

  const options: string[] = []
  let correctAnswer = 0

  // Поиск вариантов ответа
  const optionsContainer = node.children.find(c =>
    c.tag === "options" || c.tag === "варианты" || c.tag === "answers" || c.tag === "ответы"
  )

  const optionNodes = optionsContainer
    ? optionsContainer.children
    : node.children.filter(c =>
      c.tag === "option" || c.tag === "вариант" || c.tag === "answer" || c.tag === "ответ" || c.tag === "a"
    )

  for (let i = 0; i < optionNodes.length; i++) {
    const optNode = optionNodes[i]
    const optText = optNode.text.trim() || optNode.attributes.text || ""

    if (optText) {
      options.push(optText)

      // Проверка на правильный ответ
      if (
        optNode.attributes.correct === "true" ||
        optNode.attributes.правильный === "true" ||
        optNode.attributes.correct === "1"
      ) {
        correctAnswer = i
      }
    }
  }

  // Правильный ответ из атрибута или элемента
  const correctStr = getElementText(node, "correct") || getElementText(node, "правильный") ||
    node.attributes.correct || node.attributes.correctAnswer

  if (correctStr) {
    const correctNum = parseInt(correctStr)
    if (!isNaN(correctNum)) {
      correctAnswer = correctNum
    }
  }

  if (options.length < 2) {
    warnings.push(`Вопрос "${questionText.substring(0, 30)}..." имеет менее 2 вариантов`)
  }

  return {
    question: questionText,
    options,
    correctAnswer,
  }
}
