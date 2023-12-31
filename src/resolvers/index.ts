import { Resolvers } from '../types/generated/graphql';
import * as mutation from './mutation/createUser';
import { dateScalar } from './scalar/date';

const resolvers: Resolvers = {
  Query: {
    getUser: () => null,
    getTodos: () => [],
    getTodoById: () => null,
  },
  Mutation: mutation,
  Date: dateScalar
}

export default resolvers;
