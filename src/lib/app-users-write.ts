export const USER_SELECT_WITH_CREW =
  "id, email, name, phone, role, board_write, active, board_crew_id, last_login_at, created_at";

export const USER_SELECT_BASIC =
  "id, email, name, phone, role, board_write, active, last_login_at, created_at";

export function isMissingBoardCrewColumn(message: string) {
  return message.includes("board_crew_id");
}
