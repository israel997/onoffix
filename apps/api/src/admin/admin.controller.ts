import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(SuperAdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('organisations')
  listOrganisations() {
    return this.adminService.listOrganisations();
  }

  @Get('members')
  listMembers() {
    return this.adminService.listMembers();
  }

  @Patch('users/:userId/promote')
  promote(@Param('userId') userId: string) {
    return this.adminService.promote(userId);
  }

  @Patch('accounts/:accountId/ban')
  ban(@Param('accountId') accountId: string) {
    return this.adminService.setBanned(accountId, true);
  }

  @Patch('accounts/:accountId/unban')
  unban(@Param('accountId') accountId: string) {
    return this.adminService.setBanned(accountId, false);
  }

  @Patch('accounts/:accountId/restrict')
  restrict(@Param('accountId') accountId: string) {
    return this.adminService.setRestricted(accountId, true);
  }

  @Patch('accounts/:accountId/unrestrict')
  unrestrict(@Param('accountId') accountId: string) {
    return this.adminService.setRestricted(accountId, false);
  }
}
