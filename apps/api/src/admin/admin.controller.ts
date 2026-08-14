import { Body, Controller, Delete, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { AdminService } from './admin.service';
import { AdminActionDto } from './dto/admin-action.dto';

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
  ban(@Param('accountId') accountId: string, @Body() dto: AdminActionDto) {
    return this.adminService.setBanned(accountId, true, dto.password);
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

  @Delete('organisations/:organisationId')
  deleteOrganisation(@Param('organisationId') organisationId: string, @Body() dto: AdminActionDto) {
    return this.adminService.deleteOrganisation(organisationId, dto.password);
  }

  @Delete('accounts/:accountId')
  deleteAccount(@Param('accountId') accountId: string, @Body() dto: AdminActionDto) {
    return this.adminService.deleteAccount(accountId, dto.password);
  }
}
