import { z } from "zod";
import { performanceClassesArticle } from "./articles/performance-classes";
import { thermalBreakArticle } from "./articles/thermal-break";
import { uValuesArticle } from "./articles/u-values";
import { type ArticleKey, type KnowledgeArticle, articleKeys, articleSchema } from "./schemas";

/**
 * Server reads for the knowledge centre. Pages call these; components never
 * import the article modules directly. Swapping the source for a CMS changes
 * only this file.
 */

/** Index order. */
const articles: readonly KnowledgeArticle[] = [
  thermalBreakArticle,
  uValuesArticle,
  performanceClassesArticle,
];

function validate(list: readonly KnowledgeArticle[]): readonly KnowledgeArticle[] {
  const parsed = z.array(articleSchema).safeParse(list);
  if (!parsed.success) {
    throw new Error(`Invalid knowledge articles:\n${z.prettifyError(parsed.error)}`);
  }

  for (const article of list) {
    for (const [locale, content] of Object.entries(article.content)) {
      const ids = content.body.flatMap((block) => (block.type === "h2" ? [block.id] : []));
      if (new Set(ids).size !== ids.length) {
        throw new Error(`${article.key} (${locale}) has duplicate section ids`);
      }
    }
    if (article.related.includes(article.key)) {
      throw new Error(`${article.key} lists itself as related`);
    }
  }

  const keys = list.map((article) => article.key);
  if (keys.length !== articleKeys.length || articleKeys.some((key) => !keys.includes(key))) {
    throw new Error("Every article key needs exactly one article module");
  }

  return list;
}

const validated = validate(articles);

export function listArticles(): readonly KnowledgeArticle[] {
  return validated;
}

export function getArticle(key: ArticleKey): KnowledgeArticle {
  const article = validated.find((item) => item.key === key);
  if (!article) throw new Error(`Unknown article ${key}`);
  return article;
}

export function isArticleKey(value: string): value is ArticleKey {
  return (articleKeys as readonly string[]).includes(value);
}
