import { TodoStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { InputMaybe, MutationResolvers } from '../../types/generated/graphql';

export const updateTodo: MutationResolvers['updateTodo'] = async (
  parent,
  args,
  context,
  info
) => {
  const userId = context.user?.id;
  if (!userId) {
    throw new Error('Authentication Error.');
  }

  if (typeof args.id !== "number") {
    throw new Error('Invalid input error.');
  }

  const targetTodo = await prisma.todo.findUnique({
    where: {
      id: args.id,
    },
  });

  if (!targetTodo) {
    throw new Error('Not Found Todo.');
  }

  if (targetTodo.userId !== userId) {
    throw new Error('Authorization Error.');
  }

  const title = nullToUndef(args.input?.title);
  const status = nullToUndef(args.input?.status);

  const todo = await prisma.todo.update({
    where: { id: args.id, },
    data: { title, status },
    include: { user: true, },
  });
  return todo;
};

const nullToUndef = <T>(input: InputMaybe<T> | undefined) => {
  if (input === null) {
    return undefined;
  }
  return input;
}
