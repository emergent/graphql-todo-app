import { prisma } from '../../lib/prisma';
import { MutationResolvers } from '../../types/generated/graphql';

export const addTodo: MutationResolvers['addTodo'] = async (
  parent, args, context, info
) => {
  const userId = context.user?.id;
  if (!userId) {
    throw new Error('Authorization Error.');
  }

  const title = args.input?.title;
  if (!title) {
    throw new Error('Invalid input error.');
  }

  const todo = await prisma.todo.create({
    data: {
      title,
      status: 'pending',
      userId,
    },
    include: { user: true, },
  });
  return todo;
};
