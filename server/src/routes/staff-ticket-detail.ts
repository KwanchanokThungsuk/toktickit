import { Router, type Request, type Response } from "express";
import { getPrisma } from "../prisma.js";
import { internalServerError } from "../internal-error.js";
import { requireStaff, requireRequester, authenticatedUserId, requireCsrf } from "../auth.js";
const router = Router();
const owner = { select: { id: true, name: true, email: true, role: true } } as const;
router.get("/api/staff/tickets/:id", async (req: Request, res: Response) => {
  if (!requireStaff(req, res)) return;
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found" } });
  try {
    const prisma = getPrisma();
    const [ticket, eligibleOwners] = await Promise.all([
      prisma.ticket.findUnique({ where: { id }, include: { requester: { select: { id: true, name: true, email: true } }, category: true, relatedSystem: true, assignedTo: owner, attachments: { select: { id: true, originalFilename: true, contentType: true, fileSize: true, uploadedAt: true, isRemoved: true, removedAt: true, removedReason: true } } } }),
      prisma.user.findMany({ where: { isActive: true, role: { in: ["IT_STAFF", "ADMINISTRATOR"] } }, select: { id: true, name: true, email: true, role: true }, orderBy: { name: "asc" } }),
    ]);
    if (!ticket) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found" } });
    return res.json({ ...ticket, eligibleOwners });
  } catch (e) { return internalServerError(res, "STAFF DETAIL ERROR:", e); }
});
async function setOwner(req: Request, res: Response, ownerId: number | null) {
  if (!requireStaff(req, res) || !requireCsrf(req, res)) return;
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found" } });
  try {
    const prisma = getPrisma();
    if (!await prisma.ticket.findUnique({ where: { id }, select: { id: true } })) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found" } });
    if (ownerId !== null && !await prisma.user.findFirst({ where: { id: ownerId, isActive: true, role: { in: ["IT_STAFF", "ADMINISTRATOR"] } }, select: { id: true } })) return res.status(422).json({ error: { code: "INVALID_OWNER", message: "Owner must be active IT Staff or Administrator." } });
    const t = await prisma.ticket.update({ where: { id }, data: { assignedToUserId: ownerId }, select: { assignedTo: owner } });
    return res.json(t.assignedTo);
  } catch (e) { return internalServerError(res, "OWNER UPDATE ERROR:", e); }
}
router.patch("/api/staff/tickets/:id/owner", async (req: Request, res: Response) => { if (req.body?.ownerId !== null && !Number.isInteger(req.body?.ownerId)) return res.status(422).json({ error: { code: "INVALID_OWNER", message: "Invalid owner." } }); return setOwner(req, res, req.body.ownerId); });
router.post("/api/staff/tickets/:id/claim", async (req: Request, res: Response) => { if (!requireStaff(req, res) || !requireCsrf(req, res)) return; return setOwner(req, res, authenticatedUserId(req)); });
router.post("/api/tickets/:id/problem-resolved", async (req: Request,res: Response)=>{ if(!requireRequester(req,res)||!requireCsrf(req,res))return; const id=Number(req.params.id), userId=authenticatedUserId(req)!; try { const prisma=getPrisma(); const t=await prisma.ticket.findFirst({where:{id,requesterId:userId}}); if(!t)return res.status(404).json({error:{code:"NOT_FOUND",message:"Ticket not found"}}); if(t.requesterResolutionIndicatedAt)return res.status(409).json({error:{code:"ALREADY_INDICATED",message:"Already indicated."}}); if(!["IN_PROGRESS","WAITING_FOR_REQUESTER"].includes(t.currentStatus))return res.status(409).json({error:{code:"NOT_ALLOWED",message:"Not allowed in current status."}}); const updated=await prisma.ticket.update({where:{id},data:{requesterResolutionIndicatedAt:new Date(),requesterResolutionIndicatedByUserId:userId},select:{id:true,currentStatus:true,requesterResolutionIndicatedAt:true,requesterResolutionIndicatedByUserId:true}}); return res.json(updated);}catch(e){return internalServerError(res,"RESOLUTION ERROR:",e);} });
export default router;
