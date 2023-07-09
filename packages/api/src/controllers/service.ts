import { Request, Response } from "express";
import Service from "../services/service";
export class ServiceController {
  async schedule(req: Request, res: Response) {
    const { id } = req.user;
    const response = await Service.schedule({ ...req.body, userId: id });
    return res
      .status(response.status)
      .json({ data: response.data, error: response.error });
  }

  //Serviço exclusivo para admins
  async getAll(req: Request, res: Response) {
    if (req.user?.admin) {
      const response = await Service.getAllServices();
      return res
        .status(response.status)
        .json({ data: response.data, error: response.error });
    }
    return res.status(401).json({ data: null, error: "Não autorizado" });
  }
}
