import type { Contributor } from "../users/models/contributor";

export interface User extends Contributor {
  baristaToken?: string;
}