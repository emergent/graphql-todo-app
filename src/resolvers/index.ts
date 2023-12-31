import { Resolvers } from '../types/generated/graphql';
import * as mutation from './mutation/createUser';
import * as query from './query';
import { dateScalar } from './scalar/date';

const resolvers: Resolvers = {
  Query: query,
  Mutation: mutation,
  Date: dateScalar
}

export default resolvers;
