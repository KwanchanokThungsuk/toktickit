export async function generateTicketNumber(prisma: any): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `TKT-${year}-`;

  const lastTicket = await prisma.ticket.findFirst({
    where: { ticketNumber: { startsWith: prefix } },
    orderBy: { ticketNumber: "desc" },
  });

  let nextSequence = 1;
  if (lastTicket && lastTicket.ticketNumber) {
    const lastNumber = parseInt(lastTicket.ticketNumber.replace(prefix, ""), 10);
    if (!isNaN(lastNumber)) {
      nextSequence = lastNumber + 1;
    }
  }

  const sequenceString = String(nextSequence).padStart(6, "0");
  return `${prefix}${sequenceString}`;
}