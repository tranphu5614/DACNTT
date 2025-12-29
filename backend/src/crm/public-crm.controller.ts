import { Body, Controller, Post } from '@nestjs/common';
import { CrmService } from './crm.service';

@Controller('public/crm')
export class PublicCrmController {
  constructor(private readonly crmService: CrmService) {}

  @Post('submit')
  async submitRequest(@Body() body: { fullName: string; email: string; phoneNumber: string; requirement: string; companyName?: string }) {
    return this.crmService.createPublicRequest(body);
  }
}