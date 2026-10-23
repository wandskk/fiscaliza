import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { S3Client } from '@aws-sdk/client-s3';

export const leakedDependencies = [Injectable, PrismaClient, S3Client];
