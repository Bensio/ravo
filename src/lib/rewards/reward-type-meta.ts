import {
  Banknote,
  Crown,
  Gift,
  PartyPopper,
  Shirt,
  Sparkles,
  Tag,
  Ticket,
  type LucideIcon,
} from 'lucide-react';
import type { RewardType } from './types';

export function rewardTypeIcon(type: RewardType): LucideIcon {
  switch (type) {
    case 'cash':
      return Banknote;
    case 'free_ticket':
    case 'ticket_upgrade':
      return Ticket;
    case 'guestlist_perk':
    case 'experience':
      return PartyPopper;
    case 'branded_merch':
      return Shirt;
    case 'partner_product':
      return Gift;
    case 'discount_code_for_audience':
      return Tag;
    case 'status':
      return Crown;
    default:
      return Sparkles;
  }
}

export function rewardTypeAccent(type: RewardType): string {
  switch (type) {
    case 'cash':
      return 'text-emerald-400 bg-emerald-500/15';
    case 'free_ticket':
    case 'ticket_upgrade':
      return 'text-sky-400 bg-sky-500/15';
    case 'guestlist_perk':
    case 'experience':
      return 'text-violet-400 bg-violet-500/15';
    default:
      return 'text-amber-400 bg-amber-500/15';
  }
}
