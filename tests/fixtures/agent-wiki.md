# Project Aurora

A next-generation recommendation engine for e-commerce.

## Overview

Project Aurora aims to replace the legacy recommendation system with a modern, ML-driven approach. The project kicked off in January 2026 and targets Q3 for production deployment.

## Team

- Alice Chen — Tech Lead
- Bob Martinez — ML Engineer
- Carol Singh — Frontend
- David Kim — Backend

## Tasks

### Active

- [ ] Implement collaborative filtering pipeline
- [ ] Design A/B testing framework
- [ ] Migrate user preference data from legacy DB
- [x] Set up CI/CD pipeline

### Completed

- [x] Project charter approved
- [x] Data audit completed
- [x] Technology stack finalized

### Blocked

- [ ] Waiting on legal review for data retention policy
- [ ] API rate limiting — depends on infrastructure team

## Meeting Notes

### 2026-03-28

Discussed migration timeline. Alice raised concerns about data quality in the legacy system. Decision: run parallel systems for 30 days before cutover.

### 2026-03-21

Sprint review. Collaborative filtering prototype showing promising results — 12% improvement in click-through rate on test dataset.

## Architecture

### Data Flow

Raw events flow from the storefront into Kafka, processed by the ML pipeline, and served via a low-latency Redis cache.

### Tech Stack

| Component | Technology | Status |
|-----------|-----------|--------|
| Ingestion | Kafka | Production |
| ML Pipeline | PyTorch + Ray | Staging |
| Serving | Redis + FastAPI | Development |
| Frontend | React + Next.js | Development |

## Risks

1. Data quality in legacy system may require extensive cleaning
2. ML model latency must stay under 50ms p99
3. Team bandwidth — Carol is splitting time with Project Beacon
