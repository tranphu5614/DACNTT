import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DEFAULT_CATALOG } from './catalog.data';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard) // Nếu muốn public thì bỏ guard này
@Controller('catalog')
export class CatalogController {
  @Get()
  getCatalog(@Query('category') category?: string) {
    const cat = (category ?? '').toUpperCase();
    const all = DEFAULT_CATALOG;
    if (cat === 'HR' || cat === 'IT') {
      return all.filter((i) => i.category === cat);
    }
    return all;
  }
}
