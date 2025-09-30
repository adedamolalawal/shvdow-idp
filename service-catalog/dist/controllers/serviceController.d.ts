import { Request, Response } from 'express';
export declare class ServiceController {
    static getAllServices(req: Request, res: Response): Promise<void>;
    static getServiceById(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static createService(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static updateService(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static deleteService(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getServiceHealth(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getServiceStats(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=serviceController.d.ts.map