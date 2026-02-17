import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { BaoziClient } from '../client';

export interface Command {
  data: SlashCommandBuilder | any;
  execute: (interaction: ChatInputCommandInteraction, client: BaoziClient) => Promise<void>;
}
