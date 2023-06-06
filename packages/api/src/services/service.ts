import { BaseDatabase } from "../../prisma/BaseDatabase";
import { Service } from "@prisma/client";

//service service lmfao
export default class ServiceService {
  // retornar os quartos disponiveis
  static async findAvailableRooms(hotelId: number) {
    if (!hotelId) {
      return {
        data: null,
        status: 400,
        error: "Informações insuficientes.",
      };
    }
    try {
      const availableRooms = await BaseDatabase.room.findMany({
        select: { number: true },
        where: { available: true, hotelId },
      });
      let unavailability: any[] = [];
      for (let room of availableRooms) {
        const services = await BaseDatabase.service.findMany({
          select: {
            startDate: true,
            endDate: true,
          },
          where: {
            roomNumber: room.number,
            finished: false,
            endDate: {
              gt: new Date(new Date().setHours(9, 0, 0, 0)),
            },
          },
        });

        let notAvailableAt = [];

        for (let service of services) {
          const start = service.startDate;
          const end = service.endDate;
          let dia = new Date(start);

          while (dia.getTime() !== end.getTime()) {
            notAvailableAt.push(new Date(dia));
            dia = new Date(dia.getTime() + 24 * 60 * 60 * 1000);
          }
        }
        

        unavailability.push({
          room: room.number,
          notAvailableAt,
        });
      }
      

      return {
        data: unavailability,
        status: 200,
        error: "",
      };
    } catch (error) {
      console.log(error);
      return {
        data: null,
        status: 500,
        error:
          "Houve um problema ao encontrar a disponibilidade dos quartos. Tente novamente mais tarde.",
      };
    }
  }

  static async schedule(service: Service) {
    if (
      !service.startDate ||
      !service.endDate ||
      !service.petId ||
      !service.roomNumber
    ) {
      return {
        data: null,
        status: 400,
        error: "Informações insuficientes.",
      };
    }

    service.startDate = new Date(service.startDate);
    service.startDate.setHours(
      service.startDate.getHours() - service.startDate.getTimezoneOffset() / 60
    );
    service.endDate = new Date(service.endDate);
    service.endDate.setHours(
      service.endDate.getHours() - service.endDate.getTimezoneOffset() / 60
    );

    if (
      service.endDate <= service.startDate ||
      service.startDate.setHours(9, 0, 0, 0) <
        new Date().setHours(9, 0, 0, 0) ||
      service.endDate.setHours(9, 0, 0, 0) < new Date().setHours(9, 0, 0, 0)
    ) {
      return {
        data: null,
        status: 400,
        error:
          "A data de fim deve ser pelo menos um dia maior que a data de início.",
      };
    }
    try {
      const currentServices = await BaseDatabase.service.findMany({
        select: {
          startDate: true,
          endDate: true,
        },
        where: {
          roomNumber: service.roomNumber,
          finished: false,
          OR: [
            // serviço novo dentro do atual
            {
              startDate: { lte: service.startDate },
              endDate: { gt: service.startDate },
            },

            // começa fora e termina dentro do atual
            {
              startDate: { lt: service.endDate },
              endDate: { gte: service.endDate },
            },

            // serviço novo começa e termina fora do atual
            {
              startDate: { gte: service.startDate },
              endDate: { lte: service.endDate },
            },

            // serviço começa dentro e termina fora do atual
            {
              startDate: { lte: service.startDate },
              endDate: { gte: service.endDate },
            },
          ],
        },
      });
      

      if (currentServices.length) {
        return {
          data: null,
          status: 400,
          error: "Período indisponível para este quarto.",
        };
      }

      const scheduled = await BaseDatabase.service.create({ data: service });
      return {
        data: scheduled,
        status: 200,
        error: "",
      };
    } catch (error) {
      console.log(error);
      return {
        data: null,
        status: 500,
        error:
          "Houve um problema ao agendar seu serviço. Tente novamente mais tarde.",
      };
    }
  }
}
