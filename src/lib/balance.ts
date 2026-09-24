// Contribution balance for project spaces.
//
// Every member should end up bearing their share of the project's net cost
// (expenses minus income). What a member has actually put in is:
//   expenses they paid  - income they received  + settlements paid - settlements received
// Income received counts against a member because they are holding shared
// money: if one partner's bank receives the revenue, the others' share of it
// is owed back to them.
//
// balance = actual contribution - share of net cost
// Positive: the member is owed money. Negative: the member owes money.
// Across all members the balances sum to zero (when shares sum to 100%).

export type BalanceInput = {
  members: { userId: string; sharePercent: number }[];
  transactions: { memberId: string; type: "EXPENSE" | "INCOME"; amount: number }[];
  settlements: { fromUserId: string; toUserId: string; amount: number }[];
};

export type MemberBalance = {
  userId: string;
  paid: number; // expenses paid out of pocket
  received: number; // income received into own account
  settledOut: number; // settlements paid to others
  settledIn: number; // settlements received from others
  net: number; // positive = is owed, negative = owes
};

export function computeBalances(input: BalanceInput): MemberBalance[] {
  let totalExpense = 0;
  let totalIncome = 0;
  for (const t of input.transactions) {
    if (t.type === "EXPENSE") totalExpense += t.amount;
    else totalIncome += t.amount;
  }
  const netCost = totalExpense - totalIncome;

  return input.members.map((m) => {
    let paid = 0;
    let received = 0;
    for (const t of input.transactions) {
      if (t.memberId !== m.userId) continue;
      if (t.type === "EXPENSE") paid += t.amount;
      else received += t.amount;
    }
    let settledOut = 0;
    let settledIn = 0;
    for (const s of input.settlements) {
      if (s.fromUserId === m.userId) settledOut += s.amount;
      if (s.toUserId === m.userId) settledIn += s.amount;
    }
    const contribution = paid - received + settledOut - settledIn;
    const net = contribution - (m.sharePercent / 100) * netCost;
    // Round to paise so floating-point dust never shows as "owes ₹0.00".
    return {
      userId: m.userId,
      paid,
      received,
      settledOut,
      settledIn,
      net: Math.round(net * 100) / 100,
    };
  });
}
