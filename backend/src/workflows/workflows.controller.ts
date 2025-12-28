import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { WorkflowsService } from './workflows.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';

@Controller('workflows')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  @Roles('ADMIN', 'MANAGER') // Có thể thêm MANAGER để test dễ hơn
  async findAll() {
    return this.workflowsService.findAll();
  }

  @Post()
  @Roles('ADMIN', 'MANAGER')
  async create(@Body() dto: CreateWorkflowDto) {
    // [QUAN TRỌNG] In ra xem backend nhận được gì. 
    // Nếu in ra {} rỗng tuếch nghĩa là file DTO ở Bước 1 chưa sửa đúng.
    console.log('DATA NHẬN ĐƯỢC:', JSON.stringify(dto, null, 2));
    
    return this.workflowsService.createOrUpdate(dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  async delete(@Param('id') id: string) {
    return this.workflowsService.delete(id);
  }
}