import { FormField, FormSection } from "@/lib/types";

const DEFAULT_SECTION_ID = "default-section";

export function deriveSectionsFromFields(fields: FormField[]): FormSection[] {
  if (fields.length === 0) {
    return [
      {
        id: DEFAULT_SECTION_ID,
        title: "Section 1",
        description: "",
      },
    ];
  }

  const sectionMap = new Map<string, FormSection & { order: number }>();
  let fallbackOrder = 0;

  for (const field of fields) {
    const sectionId = field.sectionId || DEFAULT_SECTION_ID;
    if (sectionMap.has(sectionId)) {
      continue;
    }

    sectionMap.set(sectionId, {
      id: sectionId,
      title: field.sectionTitle?.trim() || `Section ${sectionMap.size + 1}`,
      description: field.sectionDescription || "",
      order:
        typeof field.sectionOrder === "number" && Number.isFinite(field.sectionOrder)
          ? field.sectionOrder
          : fallbackOrder,
    });

    fallbackOrder += 1;
  }

  return [...sectionMap.values()]
    .sort((a, b) => a.order - b.order)
    .map(({ id, title, description }) => ({ id, title, description }));
}

export function enrichFieldsWithSections(
  fields: FormField[],
  sections: FormSection[]
): FormField[] {
  const normalizedSections = sections.length
    ? sections
    : [
        {
          id: DEFAULT_SECTION_ID,
          title: "Section 1",
          description: "",
        },
      ];

  const sectionIndexMap = new Map(normalizedSections.map((section, index) => [section.id, index]));
  const questionOrderBySection = new Map<string, number>();

  return fields.map((field) => {
    const sectionId = field.sectionId && sectionIndexMap.has(field.sectionId)
      ? field.sectionId
      : normalizedSections[0].id;

    const sectionIndex = sectionIndexMap.get(sectionId) ?? 0;
    const section = normalizedSections[sectionIndex];
    const currentQuestionOrder = questionOrderBySection.get(sectionId) ?? 0;
    questionOrderBySection.set(sectionId, currentQuestionOrder + 1);

    return {
      ...field,
      sectionId,
      sectionTitle: section.title,
      sectionDescription: section.description || "",
      sectionOrder: sectionIndex,
      questionOrder: currentQuestionOrder,
    };
  });
}

export function orderFieldsBySectionAndQuestion(fields: FormField[]): FormField[] {
  return [...fields].sort((a, b) => {
    const sectionA = typeof a.sectionOrder === "number" ? a.sectionOrder : 0;
    const sectionB = typeof b.sectionOrder === "number" ? b.sectionOrder : 0;

    if (sectionA !== sectionB) {
      return sectionA - sectionB;
    }

    const questionA = typeof a.questionOrder === "number" ? a.questionOrder : 0;
    const questionB = typeof b.questionOrder === "number" ? b.questionOrder : 0;

    return questionA - questionB;
  });
}
