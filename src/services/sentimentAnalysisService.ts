export interface SentimentResult {
  overall: number; // -1 to 1 (negative to positive)
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  aspects: {
    quality: number;
    value: number;
    delivery: number;
    customer_service: number;
  };
  trends: {
    recentSentiment: number;
    historicalSentiment: number;
    direction: "improving" | "declining" | "stable";
  };
  keyPhrases: {
    positive: string[];
    negative: string[];
  };
}

export interface ReviewSentiment {
  text: string;
  sentiment: "positive" | "negative" | "neutral";
  score: number;
  aspects: string[];
}

// Positive and negative word lists for basic sentiment analysis
const POSITIVE_WORDS = [
  "excellent", "great", "amazing", "love", "perfect", "best", "good", "wonderful",
  "fantastic", "awesome", "nice", "happy", "satisfied", "recommend", "quality",
  "beautiful", "worth", "impressive", "outstanding", "brilliant", "superb",
  "reliable", "sturdy", "comfortable", "easy", "fast", "helpful", "friendly",
];

const NEGATIVE_WORDS = [
  "bad", "poor", "terrible", "worst", "horrible", "awful", "disappointing",
  "useless", "waste", "broken", "defective", "fake", "cheap", "uncomfortable",
  "difficult", "slow", "unhelpful", "rude", "disappointed", "regret", "avoid",
  "problem", "issue", "fail", "faulty", "damage", "inferior", "substandard",
];

const ASPECT_KEYWORDS: Record<string, string[]> = {
  quality: ["quality", "build", "material", "durability", "sturdy", "construction", "made"],
  value: ["price", "value", "worth", "money", "expensive", "cheap", "affordable"],
  delivery: ["delivery", "shipping", "arrived", "packaging", "damaged", "late", "fast"],
  customer_service: ["service", "support", "help", "response", "customer", "refund", "return"],
};

/**
 * Analyze sentiment of a single review
 */
export function analyzeSingleReview(reviewText: string): ReviewSentiment {
  const lowerText = reviewText.toLowerCase();
  const words = lowerText.split(/\s+/);
  
  let positiveScore = 0;
  let negativeScore = 0;
  
  // Count positive and negative words
  words.forEach(word => {
    if (POSITIVE_WORDS.some(pw => word.includes(pw))) positiveScore++;
    if (NEGATIVE_WORDS.some(nw => word.includes(nw))) negativeScore++;
  });
  
  // Calculate overall score
  const totalSentimentWords = positiveScore + negativeScore;
  let score = 0;
  
  if (totalSentimentWords > 0) {
    score = (positiveScore - negativeScore) / totalSentimentWords;
  }
  
  // Determine sentiment category
  let sentiment: "positive" | "negative" | "neutral";
  if (score > 0.2) sentiment = "positive";
  else if (score < -0.2) sentiment = "negative";
  else sentiment = "neutral";
  
  // Detect aspects mentioned
  const aspects: string[] = [];
  Object.entries(ASPECT_KEYWORDS).forEach(([aspect, keywords]) => {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      aspects.push(aspect);
    }
  });
  
  return {
    text: reviewText,
    sentiment,
    score,
    aspects,
  };
}

/**
 * Analyze sentiment across multiple reviews
 */
export function analyzeSentiment(reviews: string[]): SentimentResult {
  if (reviews.length === 0) {
    return {
      overall: 0,
      positiveCount: 0,
      negativeCount: 0,
      neutralCount: 0,
      aspects: {
        quality: 0,
        value: 0,
        delivery: 0,
        customer_service: 0,
      },
      trends: {
        recentSentiment: 0,
        historicalSentiment: 0,
        direction: "stable",
      },
      keyPhrases: {
        positive: [],
        negative: [],
      },
    };
  }

  // Analyze each review
  const analyzedReviews = reviews.map(review => analyzeSingleReview(review));
  
  // Count sentiments
  const positiveCount = analyzedReviews.filter(r => r.sentiment === "positive").length;
  const negativeCount = analyzedReviews.filter(r => r.sentiment === "negative").length;
  const neutralCount = analyzedReviews.filter(r => r.sentiment === "neutral").length;
  
  // Calculate overall sentiment
  const totalScore = analyzedReviews.reduce((sum, r) => sum + r.score, 0);
  const overall = totalScore / analyzedReviews.length;
  
  // Analyze aspects
  const aspectScores = {
    quality: 0,
    value: 0,
    delivery: 0,
    customer_service: 0,
  };
  
  const aspectCounts = {
    quality: 0,
    value: 0,
    delivery: 0,
    customer_service: 0,
  };
  
  analyzedReviews.forEach(review => {
    review.aspects.forEach(aspect => {
      if (aspect in aspectScores) {
        aspectScores[aspect as keyof typeof aspectScores] += review.score;
        aspectCounts[aspect as keyof typeof aspectCounts]++;
      }
    });
  });
  
  // Calculate average aspect scores
  Object.keys(aspectScores).forEach(aspect => {
    const key = aspect as keyof typeof aspectScores;
    if (aspectCounts[key] > 0) {
      aspectScores[key] = aspectScores[key] / aspectCounts[key];
    }
  });
  
  // Analyze trends (recent vs historical)
  const midpoint = Math.floor(analyzedReviews.length / 2);
  const recentReviews = analyzedReviews.slice(0, midpoint);
  const historicalReviews = analyzedReviews.slice(midpoint);
  
  const recentSentiment = recentReviews.reduce((sum, r) => sum + r.score, 0) / recentReviews.length;
  const historicalSentiment = historicalReviews.reduce((sum, r) => sum + r.score, 0) / historicalReviews.length;
  
  let direction: "improving" | "declining" | "stable";
  const difference = recentSentiment - historicalSentiment;
  if (difference > 0.1) direction = "improving";
  else if (difference < -0.1) direction = "declining";
  else direction = "stable";
  
  // Extract key phrases
  const positiveReviews = analyzedReviews.filter(r => r.sentiment === "positive");
  const negativeReviews = analyzedReviews.filter(r => r.sentiment === "negative");
  
  const keyPhrases = {
    positive: extractKeyPhrases(positiveReviews.map(r => r.text)).slice(0, 5),
    negative: extractKeyPhrases(negativeReviews.map(r => r.text)).slice(0, 5),
  };
  
  return {
    overall,
    positiveCount,
    negativeCount,
    neutralCount,
    aspects: aspectScores,
    trends: {
      recentSentiment,
      historicalSentiment,
      direction,
    },
    keyPhrases,
  };
}

/**
 * Extract key phrases from reviews
 */
function extractKeyPhrases(reviews: string[]): string[] {
  const phrases: Record<string, number> = {};
  
  reviews.forEach(review => {
    const sentences = review.split(/[.!?]+/).filter(s => s.trim().length > 0);
    sentences.forEach(sentence => {
      const trimmed = sentence.trim();
      if (trimmed.length > 20 && trimmed.length < 100) {
        phrases[trimmed] = (phrases[trimmed] || 0) + 1;
      }
    });
  });
  
  // Sort by frequency and return top phrases
  return Object.entries(phrases)
    .sort((a, b) => b[1] - a[1])
    .map(([phrase]) => phrase);
}

/**
 * Generate sentiment summary text
 */
export function generateSentimentSummary(result: SentimentResult): string {
  const totalReviews = result.positiveCount + result.negativeCount + result.neutralCount;
  const positivePercent = (result.positiveCount / totalReviews) * 100;
  const negativePercent = (result.negativeCount / totalReviews) * 100;
  
  let summary = `Based on ${totalReviews} reviews: `;
  
  if (result.overall > 0.3) {
    summary += `Highly positive sentiment (${positivePercent.toFixed(0)}% positive). `;
  } else if (result.overall > 0) {
    summary += `Generally positive sentiment (${positivePercent.toFixed(0)}% positive). `;
  } else if (result.overall > -0.3) {
    summary += `Mixed sentiment (${positivePercent.toFixed(0)}% positive, ${negativePercent.toFixed(0)}% negative). `;
  } else {
    summary += `Negative sentiment (${negativePercent.toFixed(0)}% negative). `;
  }
  
  // Add trend
  if (result.trends.direction === "improving") {
    summary += "Sentiment is improving over time. ";
  } else if (result.trends.direction === "declining") {
    summary += "Sentiment is declining over time. ";
  }
  
  // Add aspect highlights
  const topAspect = Object.entries(result.aspects).reduce((a, b) => a[1] > b[1] ? a : b);
  const worstAspect = Object.entries(result.aspects).reduce((a, b) => a[1] < b[1] ? a : b);
  
  if (topAspect[1] > 0.2) {
    summary += `Customers particularly appreciate the ${topAspect[0].replace('_', ' ')}. `;
  }
  
  if (worstAspect[1] < -0.2) {
    summary += `Main concern is ${worstAspect[0].replace('_', ' ')}. `;
  }
  
  return summary;
}

/**
 * Create sentiment chart data for visualization
 */
export function createSentimentChartData(result: SentimentResult) {
  return {
    distribution: [
      { label: "Positive", value: result.positiveCount, color: "#10b981" },
      { label: "Neutral", value: result.neutralCount, color: "#f59e0b" },
      { label: "Negative", value: result.negativeCount, color: "#ef4444" },
    ],
    aspects: Object.entries(result.aspects).map(([aspect, score]) => ({
      aspect: aspect.replace('_', ' ').toUpperCase(),
      score: Math.round((score + 1) * 50), // Convert -1 to 1 scale to 0-100
    })),
    trend: {
      historical: Math.round((result.trends.historicalSentiment + 1) * 50),
      recent: Math.round((result.trends.recentSentiment + 1) * 50),
    },
  };
}
