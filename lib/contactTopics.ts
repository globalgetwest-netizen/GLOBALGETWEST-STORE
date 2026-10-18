// lib/contactTopics.ts
// Topics on the contact form. Shared by the form and /api/contact; a link
// can preselect one with /contact?topic=order.
export const CONTACT_TOPICS = [
  { id: 'general', label: 'General question' },
  { id: 'order', label: 'Order support' },
  { id: 'shipping', label: 'Shipping & delivery' },
  { id: 'payment', label: 'Payment' },
  { id: 'product', label: 'Product information' },
  { id: 'records', label: 'My health record (correction or deletion)' },
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number]['id'];
