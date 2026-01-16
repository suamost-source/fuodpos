import { Product } from './types';

export const COLORS = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
  'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
  'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
  'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500',
  'bg-rose-500'
];

export const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'Espresso', price: 2.50, category: 'Coffee', color: 'bg-orange-800' },
  { id: '2', name: 'Latte', price: 3.50, category: 'Coffee', color: 'bg-orange-600' },
  { id: '3', name: 'Cappuccino', price: 3.50, category: 'Coffee', color: 'bg-orange-700' },
  { id: '4', name: 'Iced Americano', price: 3.00, category: 'Coffee', color: 'bg-blue-400' },
  { id: '5', name: 'Blueberry Muffin', price: 2.75, category: 'Bakery', color: 'bg-blue-600' },
  { id: '6', name: 'Croissant', price: 2.50, category: 'Bakery', color: 'bg-yellow-600' },
  { id: '7', name: 'Avocado Toast', price: 6.50, category: 'Food', color: 'bg-green-600' },
  { id: '8', name: 'Sparkling Water', price: 1.50, category: 'Drinks', color: 'bg-cyan-400' },
];

export const CATEGORIES = ['All', 'Coffee', 'Bakery', 'Food', 'Drinks', 'Other'];
