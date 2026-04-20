import { config, loadState, saveState } from "../config.ts";
import type { Analyst, IntelPost, MarketplaceState, Purchase } from "../types.ts";

export class MarketplaceRepository {
  private readonly path: string;

  constructor(path: string = config.dataPath) {
    this.path = path;
  }

  read(): MarketplaceState {
    return loadState(this.path);
  }

  write(state: MarketplaceState): void {
    saveState(this.path, state);
  }

  upsertAnalyst(analyst: Analyst): MarketplaceState {
    const state = this.read();
    const index = state.analysts.findIndex((item) => item.handle.toLowerCase() === analyst.handle.toLowerCase());

    if (index >= 0) {
      state.analysts[index] = analyst;
    } else {
      state.analysts.push(analyst);
    }

    this.write(state);
    return state;
  }

  updateAnalyst(handle: string, updater: (analyst: Analyst) => Analyst): Analyst {
    const state = this.read();
    const index = state.analysts.findIndex((item) => item.handle.toLowerCase() === handle.toLowerCase());
    if (index < 0) {
      throw new Error(`Analyst not found: ${handle}`);
    }

    const next = updater(state.analysts[index]);
    state.analysts[index] = next;
    this.write(state);
    return next;
  }

  addPost(post: IntelPost): MarketplaceState {
    const state = this.read();
    state.posts.push(post);
    this.write(state);
    return state;
  }

  addPurchase(purchase: Purchase): MarketplaceState {
    const state = this.read();
    state.purchases.push(purchase);

    const post = state.posts.find((item) => item.id === purchase.postId);
    if (post) {
      post.purchaseCount += 1;
      post.updatedAt = purchase.createdAt;
    }

    const analyst = state.analysts.find((item) => item.handle.toLowerCase() === purchase.analystHandle.toLowerCase());
    if (analyst) {
      analyst.stats.sales += 1;
      analyst.stats.revenueUsd += purchase.amountUsd;
      analyst.stats.postsPublished = state.posts.filter(
        (item) => item.analystHandle.toLowerCase() === analyst.handle.toLowerCase(),
      ).length;
      analyst.updatedAt = purchase.createdAt;
    }

    this.write(state);
    return state;
  }

  updatePurchase(purchaseId: string, updater: (purchase: Purchase) => Purchase): Purchase {
    const state = this.read();
    const index = state.purchases.findIndex((item) => item.id === purchaseId);
    if (index < 0) {
      throw new Error(`Purchase not found: ${purchaseId}`);
    }

    const updated = updater(state.purchases[index]);
    state.purchases[index] = updated;
    this.write(state);
    return updated;
  }

  findAnalyst(handle: string): Analyst | undefined {
    return this.read().analysts.find((item) => item.handle.toLowerCase() === handle.toLowerCase());
  }

  findPost(postId: string): IntelPost | undefined {
    return this.read().posts.find((item) => item.id === postId);
  }

  listPosts(): IntelPost[] {
    return this.read().posts;
  }

  listAnalysts(): Analyst[] {
    return this.read().analysts;
  }

  listPurchases(): Purchase[] {
    return this.read().purchases;
  }
}
