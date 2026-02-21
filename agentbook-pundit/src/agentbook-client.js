import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import nacl from 'tweetnacl';

export class AgentBookClient {
  constructor(config) {
    this.config = config;
    this.apiBase = config.baoziApiBase;
    this.walletAddress = config.walletAddress;
    
    // Initialize Solana connection and wallet if private key provided
    if (config.solanaPrivateKey && config.solanaPrivateKey !== 'your_private_key_here') {
      try {
        const privateKeyBytes = bs58.decode(config.solanaPrivateKey);
        this.wallet = Keypair.fromSecretKey(privateKeyBytes);
        this.connection = new Connection('https://api.mainnet-beta.solana.com');
        console.log(`🔑 Wallet loaded: ${this.wallet.publicKey.toString()}`);
      } catch (error) {
        console.warn('⚠️  Invalid private key, running in demo mode');
        this.wallet = null;
      }
    } else {
      this.wallet = null;
    }
  }

  async getPosts() {
    try {
      const response = await fetch(`${this.apiBase}/agentbook/posts`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch posts: ${response.status}`);
      }
      
      const data = await response.json();
      return data.posts || [];
      
    } catch (error) {
      console.error('❌ Error fetching AgentBook posts:', error);
      throw error;
    }
  }

  async postAnalysis(content, marketPda = null) {
    if (!this.config.isLive) {
      console.log('📝 DEMO MODE - Would post to AgentBook:');
      console.log(content);
      return { success: true, demo: true };
    }

    // Validate content length
    if (content.length < 10 || content.length > 2000) {
      throw new Error(`Content length ${content.length} is outside allowed range (10-2000 characters)`);
    }

    const payload = {
      walletAddress: this.walletAddress,
      content: content.substring(0, 2000), // Ensure we don't exceed limit
    };

    if (marketPda) {
      payload.marketPda = marketPda;
    }

    try {
      const response = await fetch(`${this.apiBase}/agentbook/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AgentBook post failed (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Posted to AgentBook:', result);
      return result;

    } catch (error) {
      console.error('❌ Error posting to AgentBook:', error);
      throw error;
    }
  }

  async commentOnMarket(marketPda, comment) {
    if (!this.config.isLive) {
      console.log(`💬 DEMO MODE - Would comment on ${marketPda}:`);
      console.log(`"${comment}"`);
      return { success: true, demo: true };
    }

    // Validate comment length
    if (comment.length < 10 || comment.length > 500) {
      throw new Error(`Comment length ${comment.length} is outside allowed range (10-500 characters)`);
    }

    if (!this.wallet) {
      throw new Error('Wallet required for market comments (signing needed)');
    }

    try {
      // Create message to sign
      const message = `Comment on market ${marketPda}: ${comment}`;
      const messageBytes = new TextEncoder().encode(message);
      
      // Sign the message
      const signature = nacl.sign.detached(messageBytes, this.wallet.secretKey);
      const signatureBase58 = bs58.encode(signature);

      const response = await fetch(`${this.apiBase}/markets/${marketPda}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': this.wallet.publicKey.toString(),
          'x-signature': signatureBase58,
          'x-message': message
        },
        body: JSON.stringify({
          content: comment.substring(0, 500) // Ensure we don't exceed limit
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Market comment failed (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ Commented on market ${marketPda}:`, result);
      return result;

    } catch (error) {
      console.error(`❌ Error commenting on market ${marketPda}:`, error);
      throw error;
    }
  }

  async createCreatorProfile() {
    if (!this.wallet) {
      throw new Error('Wallet required to create creator profile');
    }

    try {
      // This would typically call the Baozi MCP server's build_create_creator_profile_transaction
      // For now, we'll just simulate the response
      console.log('🎯 Creator profile creation would happen here using MCP server');
      
      const response = await fetch(`${this.apiBase}/creator-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: this.wallet.publicKey.toString()
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`Creator profile creation failed: ${errorText}`);
        return null;
      }

      return await response.json();

    } catch (error) {
      console.warn('⚠️  Creator profile creation failed:', error.message);
      return null;
    }
  }

  async checkCooldown() {
    // Check if we're within the 30-minute cooldown period
    // This would typically be tracked locally or via API
    const lastPostTime = this.getLastPostTime();
    if (!lastPostTime) return false;

    const cooldownMs = this.config.cooldownMinutes * 60 * 1000;
    return (Date.now() - lastPostTime) < cooldownMs;
  }

  getLastPostTime() {
    // In a real implementation, this would be stored persistently
    // For demo, we'll just return null
    return null;
  }

  setLastPostTime(timestamp) {
    // In a real implementation, this would be stored persistently
    console.log(`📝 Last post time set to: ${new Date(timestamp).toISOString()}`);
  }
}